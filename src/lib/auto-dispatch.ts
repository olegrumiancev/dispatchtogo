import { prisma } from "@/lib/prisma";

/**
 * Auto-dispatch: find a matching vendor for the given service request
 * and create a job assignment. Matching logic:
 * 1. Find active vendors with a VendorSkill matching the request category
 * 2. Pick the vendor with the fewest active (incomplete) jobs (load balancing)
 * 3. Create a Job and update the request status to DISPATCHED
 *
 * Returns true if dispatched, false if no matching vendor found.
 */
export async function autoDispatch(serviceRequestId: string): Promise<boolean> {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { category: true, organizationId: true },
    });

    if (!request) return false;

    // Find active vendors whose skills match the request category
    const matchingVendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        skills: {
          some: { category: request.category },
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
