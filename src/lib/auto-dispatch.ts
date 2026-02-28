import { prisma } from "@/lib/prisma";

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
 * Matching logic:
 * 1. Pull all active vendors with their skills
 * 2. Filter in-app using case-invariant comparison against request category
 * 3. Pick the vendor with the fewest active (incomplete) jobs (load balancing)
 * 4. Create a Job (OFFERED) and update the request status to DISPATCHED
 *
 * If no vendor matches, moves the request to READY_TO_DISPATCH for manual
 * assignment.
 */
export async function autoDispatch(
  serviceRequestId: string
): Promise<boolean> {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { category: true, organizationId: true },
    });

    if (!request) return false;

    const requestCategory = request.category;

    // Pull all active vendors with their skills and active-job count.
    // Filtering is done in-app so we can do case-invariant matching.
    const allActiveVendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        skills: true,
        _count: {
          select: {
            jobs: { where: { completedAt: null } },
          },
        },
      },
    });

    // Keep only vendors whose skills include the requested category
    const matchingVendors = allActiveVendors.filter((v) =>
      v.skills.some((s) => categoriesMatch(s.category, requestCategory))
    );

    if (matchingVendors.length === 0) {
      // No matching vendor — move to READY_TO_DISPATCH for manual assignment
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
