import { prisma } from "@/lib/prisma";

function categoriesMatch(a: string, b: string): boolean {
  return (
    a.trim().toLowerCase().replace(/\s+/g, " ") ===
    b.trim().toLowerCase().replace(/\s+/g, " ")
  );
}

export type DispatchDiag = {
  result: boolean;
  error: string | null;
  requestCategory: string | null;
  activeVendorCount: number;
  vendorSkills: Array<{ vendor: string; skills: string[] }>;
  matchCount: number;
  assignedTo: string | null;
};

export async function autoDispatch(
  serviceRequestId: string
): Promise<DispatchDiag> {
  const diag: DispatchDiag = {
    result: false,
    error: null,
    requestCategory: null,
    activeVendorCount: 0,
    vendorSkills: [],
    matchCount: 0,
    assignedTo: null,
  };

  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: { category: true, organizationId: true },
    });

    if (!request) {
      diag.error = "Request not found";
      return diag;
    }

    diag.requestCategory = request.category;

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

    diag.activeVendorCount = allActiveVendors.length;
    diag.vendorSkills = allActiveVendors.map((v) => ({
      vendor: v.companyName,
      skills: v.skills.map((s) => s.category),
    }));

    const matchingVendors = allActiveVendors.filter((v) =>
      v.skills.some((s) => categoriesMatch(s.category, request.category))
    );

    diag.matchCount = matchingVendors.length;

    if (matchingVendors.length === 0) {
      await prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "READY_TO_DISPATCH" },
      });
      return diag;
    }

    const sorted = matchingVendors.sort(
      (a, b) => a._count.jobs - b._count.jobs
    );
    const bestVendor = sorted[0];
    diag.assignedTo = bestVendor.companyName;

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

    diag.result = true;
    return diag;
  } catch (error: unknown) {
    diag.error = error instanceof Error ? error.message : String(error);
    console.error("[auto-dispatch] Error:", error);
    return diag;
  }
}
