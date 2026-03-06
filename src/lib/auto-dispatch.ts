import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { sendVendorDispatchNotification } from "@/lib/sms";
import { sendVendorDispatchEmail } from "@/lib/email";

/**
 * Culture- and case-invariant equality check for category strings.
 * Normalises whitespace, trims, and lowercases both sides so that
 * "PLUMBING", "Plumbing", "plumbing", etc. all match.
 */
function categoriesMatch(a: string, b: string): boolean {
  return (
    a.trim().toLowerCase().replace(/\s+/g, " ") ===
    b.trim().toLowerCase().replace(/\s+/g, " ")
  );
}

/**
 * Auto-dispatch: find a matching vendor for the given service request
 * and create a job assignment.
 *
 * Cascade logic (most-specific first):
 * 1. Operator explicitly chose a vendor in the form → use that vendor
 * 2. Preferred vendor for this property + category
 * 3. Preferred vendor for this org + category (property = null)
 * 4. Any active + AVAILABLE vendor with matching skill (load-balanced by fewest active jobs)
 * 5. No match → READY_TO_DISPATCH for manual admin assignment
 *
 * NOTE: Only vendors with availabilityStatus === "AVAILABLE" are considered
 * for auto-dispatch. BUSY and OFF_DUTY vendors are skipped.
 */
export async function autoDispatch(
  serviceRequestId: string,
  preferredVendorId?: string | null
): Promise<boolean> {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { category: true, organizationId: true, propertyId: true },
    });

    if (!request) return false;

    const { category: requestCategory, organizationId, propertyId } = request;
    let chosenVendorId: string | null = null;

    // ── Step 1: Operator explicitly chose a vendor ──────────────────────
    if (preferredVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: preferredVendorId,
          isActive: true,
          availabilityStatus: "AVAILABLE",
        },
      });
      if (vendor) {
        chosenVendorId = vendor.id;
      }
    }

    // ── Step 2: Property-level preferred vendor ─────────────────────────
    if (!chosenVendorId && propertyId) {
      const prefs = await prisma.preferredVendor.findMany({
        where: { organizationId, propertyId },
        include: { vendor: true },
      });
      const match = prefs.find(
        (p) =>
          categoriesMatch(p.category, requestCategory) &&
          p.vendor.isActive &&
          p.vendor.availabilityStatus === "AVAILABLE"
      );
      if (match) {
        chosenVendorId = match.vendorId;
      }
    }

    // ── Step 3: Org-level preferred vendor (property = null) ────────────
    if (!chosenVendorId) {
      const prefs = await prisma.preferredVendor.findMany({
        where: { organizationId, propertyId: null },
        include: { vendor: true },
      });
      const match = prefs.find(
        (p) =>
          categoriesMatch(p.category, requestCategory) &&
          p.vendor.isActive &&
          p.vendor.availabilityStatus === "AVAILABLE"
      );
      if (match) {
        chosenVendorId = match.vendorId;
      }
    }

    // ── Step 4: Skill-based match with load balancing ───────────────────
    if (!chosenVendorId) {
      const allActiveVendors = await prisma.vendor.findMany({
        where: {
          isActive: true,
          availabilityStatus: "AVAILABLE",
        },
        include: {
          skills: true,
          _count: {
            select: {
              jobs: { where: { completedAt: null } },
            },
          },
        },
      });

      const matchingVendors = allActiveVendors.filter((v) =>
        v.skills.some((s) => categoriesMatch(s.category, requestCategory))
      );

      if (matchingVendors.length > 0) {
        const sorted = matchingVendors.sort(
          (a, b) => a._count.jobs - b._count.jobs
        );
        chosenVendorId = sorted[0].id;
      }
    }

    // ── Step 5: No match → READY_TO_DISPATCH ────────────────────────────
    if (!chosenVendorId) {
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "READY_TO_DISPATCH" },
      });
      return false;
    }

    // Create job and update request status in a transaction
    const [createdJob] = await prisma.$transaction([
      prisma.job.create({
        data: {
          serviceRequestId,
          vendorId: chosenVendorId,
          organizationId,
          status: "OFFERED",
        },
      }),
      prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "DISPATCHED" },
      }),
    ]);

    // Fire-and-forget: notify the assigned vendor (SMS + email + in-app)
    // Mirrors the same logic in /api/requests/[id]/dispatch/route.ts
    if (NOTIFICATION_SETTINGS.notifyVendorOnDispatch) {
      const [vendor, property, fullRequest] = await Promise.all([
        prisma.vendor.findUnique({ where: { id: chosenVendorId } }),
        prisma.property.findUnique({ where: { id: propertyId ?? "" } }),
        prisma.serviceRequest.findUnique({
          where: { id: serviceRequestId },
          select: { urgency: true, description: true, referenceNumber: true },
        }),
      ]);

      if (vendor && fullRequest) {
        const notifDetails = {
          category: request.category,
          propertyName: property?.name ?? "Unknown Property",
          urgency: fullRequest.urgency,
          description: fullRequest.description,
          refNumber: fullRequest.referenceNumber,
        };

        sendVendorDispatchNotification(vendor.phone, vendor.companyName, notifDetails).then((r) => {
          if (!r.success) console.error("[auto-dispatch] SMS to vendor failed:", r.error);
        });

        if (NOTIFICATION_SETTINGS.emailEnabled) {
          sendVendorDispatchEmail(vendor.email, vendor.companyName, notifDetails).then((r) => {
            if (!r.success) console.error("[auto-dispatch] Email to vendor failed:", r.error);
          });
        }

        // In-app notification for the vendor's user account(s)
        prisma.user.findMany({
          where: { vendorId: chosenVendorId },
          select: { id: true },
        }).then((vendorUsers) => {
          if (vendorUsers.length === 0) return;
          return prisma.notification.createMany({
            data: vendorUsers.map((u) => ({
              userId: u.id,
              title: `New job dispatched – ${fullRequest.referenceNumber}`,
              body: `A new job at ${property?.name ?? "your assigned property"} (${request.category}) has been dispatched to you. Please log in to accept or decline.`,
              type: "JOB_DISPATCHED",
              link: `/app/vendor/jobs/${createdJob.id}`,
            })),
          });
        }).catch((e) => console.error("[auto-dispatch] In-app notification failed:", e));
      }
    }

    return true;
  } catch (error) {
    console.error("[auto-dispatch] Error:", error);
    return false;
  }
}
