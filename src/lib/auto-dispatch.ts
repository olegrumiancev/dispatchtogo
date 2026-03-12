import { prisma } from "@/lib/prisma";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";
import { sendVendorDispatchNotification } from "@/lib/sms";
import { sendVendorDispatchEmail } from "@/lib/email";
import { SERVICE_CATEGORIES } from "@/lib/constants";

function categoriesMatch(a: string, b: string): boolean {
  return (
    a.trim().toLowerCase().replace(/\s+/g, " ") ===
    b.trim().toLowerCase().replace(/\s+/g, " ")
  );
}

function getCategoryLabel(category: string) {
  return (
    SERVICE_CATEGORIES.find((entry) => entry.value === category)?.label ?? category
  );
}

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

    // Step 1: operator explicitly chose a vendor.
    if (preferredVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: preferredVendorId,
          status: "ACTIVE",
          availabilityStatus: "AVAILABLE",
        },
      });
      if (vendor) {
        chosenVendorId = vendor.id;
      }
    }

    // Step 2: property-level preferred vendor.
    if (!chosenVendorId && propertyId) {
      const prefs = await prisma.preferredVendor.findMany({
        where: { organizationId, propertyId },
        include: { vendor: true },
      });
      const match = prefs.find(
        (preference) =>
          categoriesMatch(preference.category, requestCategory) &&
          preference.vendor.status === "ACTIVE" &&
          preference.vendor.availabilityStatus === "AVAILABLE"
      );
      if (match) {
        chosenVendorId = match.vendorId;
      }
    }

    // Step 3: org-level preferred vendor.
    if (!chosenVendorId) {
      const prefs = await prisma.preferredVendor.findMany({
        where: { organizationId, propertyId: null },
        include: { vendor: true },
      });
      const match = prefs.find(
        (preference) =>
          categoriesMatch(preference.category, requestCategory) &&
          preference.vendor.status === "ACTIVE" &&
          preference.vendor.availabilityStatus === "AVAILABLE"
      );
      if (match) {
        chosenVendorId = match.vendorId;
      }
    }

    // Step 4: skill-based match with load balancing.
    if (!chosenVendorId) {
      const allActiveVendors = await prisma.vendor.findMany({
        where: {
          status: "ACTIVE",
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

      const matchingVendors = allActiveVendors.filter((vendor) =>
        vendor.skills.some((skill) => categoriesMatch(skill.category, requestCategory))
      );

      if (matchingVendors.length > 0) {
        const sorted = matchingVendors.sort(
          (left, right) => left._count.jobs - right._count.jobs
        );
        chosenVendorId = sorted[0].id;
      }
    }

    // Step 5: no match, leave the request ready for manual dispatch.
    if (!chosenVendorId) {
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "READY_TO_DISPATCH" },
      });
      return false;
    }

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
        const propertyName = property?.name ?? "Assigned property";
        const categoryLabel = getCategoryLabel(request.category);
        const notifDetails = {
          category: request.category,
          propertyName: property?.name ?? "Unknown Property",
          urgency: fullRequest.urgency,
          description: fullRequest.description,
          refNumber: fullRequest.referenceNumber,
        };

        sendVendorDispatchNotification(
          vendor.phone,
          vendor.companyName,
          notifDetails
        ).then((result) => {
          if (!result.success) {
            console.error("[auto-dispatch] SMS to vendor failed:", result.error);
          }
        });

        if (NOTIFICATION_SETTINGS.emailEnabled) {
          sendVendorDispatchEmail(
            vendor.email,
            vendor.companyName,
            notifDetails
          ).then((result) => {
            if (!result.success) {
              console.error("[auto-dispatch] Email to vendor failed:", result.error);
            }
          });
        }

        prisma.user
          .findMany({
            where: { vendorId: chosenVendorId },
            select: { id: true },
          })
          .then((vendorUsers) => {
            if (vendorUsers.length === 0) return;
            return prisma.notification.createMany({
              data: vendorUsers.map((user) => ({
                userId: user.id,
                title: "New job waiting",
                body: `${fullRequest.referenceNumber} | ${propertyName} | ${categoryLabel}. Review and accept or pass.`,
                type: "JOB_DISPATCHED",
                link: `/app/vendor/jobs/${createdJob.id}`,
                metadata: {
                  referenceNumber: fullRequest.referenceNumber,
                  propertyName,
                  category: request.category,
                  categoryLabel,
                  jobId: createdJob.id,
                },
              })),
            });
          })
          .catch((error) =>
            console.error("[auto-dispatch] In-app notification failed:", error)
          );
      }
    }

    return true;
  } catch (error) {
    console.error("[auto-dispatch] Error:", error);
    return false;
  }
}
