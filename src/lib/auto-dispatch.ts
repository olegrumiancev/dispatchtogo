import { prisma } from "@/lib/prisma";

// Category normalization map: handle seeded title-case values
const CATEGORY_NORMALIZE: Record<string, string> = {
  Plumbing: "PLUMBING",
  Electrical: "ELECTRICAL",
  HVAC: "HVAC",
  "Snow Removal": "SNOW_REMOVAL",
  Landscaping: "LANDSCAPING",
  "General Maintenance": "GENERAL",
  Cleaning: "CLEANING",
  "Pest Control": "PEST",
  Locksmith: "LOCKSMITH",
  "Dock / Marina": "DOCK_MARINA",
  Structural: "STRUCTURAL",
  "Appliance Repair": "APPLIANCE",
  Other: "OTHER",
};

function normalizeCategory(cat: string): string {
  return CATEGORY_NORMALIZE[cat] ?? cat;
}

/**
 * Auto-dispatch: find a matching vendor for the given service request
 * and create a job assignment. Matching logic:
 * 1. Find active vendors with a VendorSkill matching the request category
 * 2. Pick the vendor with the fewest active (incomplete) jobs (load balancing)
 * 3. Create a Job and update the request status to DISPATCHED
 */
export async function autoDispatch(serviceRequestId: string): Promise<boolean> {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { category: true, organizationId: true },
    });

    if (!request) return false;

    const requestCategory = request.category;

    // Find active vendors whose skills match the request category
    // Check both the raw value and normalized value for compatibility
    const matchingVendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        skills: {
          some: {
            OR: [
              { category: requestCategory },
              { category: normalizeCategory(requestCategory) },
              // Also check reverse: if DB has title-case and request is uppercase
              ...Object.entries(CATEGORY_NORMALIZE)
                .filter(([, v]) => v === requestCategory)
                .map(([k]) => ({ category: k })),
            ],
          },
        },
      },
      include: {
        _count: {
          select: {
            jobs: {
              where: { completedAt: null },
            },
          },
        },
      },
    });

    if (matchingVendors.length === 0) {
      // No matching vendor \u2014 move to READY_TO_DISPATCH for manual assignment
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "READY_TO_DISPATCH" },
      });
      return false;
    }

    // Pick the vendor with the fewest active jobs
    const sorted = matchingVendors.sort(
      (a, b) => a._count.jobs - b._count.jobs
    );
    const bestVendor = sorted[0];

    // Create job and update request status in a transaction
    await prisma.$transaction([
      prisma.job.create({
        data: {
          serviceRequestId,
          vendorId: bestVendor.id,
          organizationId: request.organizationId,
          status: "OFFERED",
        },
      }),
      prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "DISPATCHED" },
      }),
    ]);

    return true;
  } catch (error) {
    console.error("[auto-dispatch] Error:", error);
    return false;
  }
}
