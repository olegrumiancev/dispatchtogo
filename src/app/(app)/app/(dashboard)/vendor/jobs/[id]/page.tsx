import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStoredTriageArtifact } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";
import { VendorJobDetail } from "@/components/forms/vendor-job-detail";

export default async function VendorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      serviceRequest: {
        include: {
          property: true,
          photos: true,
          aiClassifications: { take: 1, orderBy: { createdAt: "desc" } },
        },
      },
      notes: {
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      photos: true,
      materials: true,
      proofPacket: true,
    },
  });

  if (!job) notFound();

  // Vendor can only view their own jobs
  if (job.vendorId !== vendorId) {
    redirect("/app/vendor/jobs");
  }

  const triageArtifact = await getStoredTriageArtifact(job.serviceRequestId);

  const reqAny = job.serviceRequest as any;
  const aiClass = reqAny.aiClassifications?.[0];
  const vendorBrief =
    reqAny.aiTriageSummary || aiClass || triageArtifact?.data
      ? {
          summary: triageArtifact?.data.summary ?? reqAny.aiTriageSummary ?? null,
          category: triageArtifact?.data.category ?? aiClass?.suggestedCategory ?? job.serviceRequest.category,
          urgency: triageArtifact?.data.urgency ?? job.serviceRequest.urgency,
          requiresLicensedTrade: triageArtifact?.data.requiresLicensedTrade ?? false,
          clarifyingQuestions: triageArtifact?.data.clarifyingQuestions ?? [],
          reasoning: triageArtifact?.data.reasoning ?? aiClass?.reasoning ?? null,
        }
      : null;

  // Serialize dates so they can be passed to client components
  const serialized = JSON.parse(JSON.stringify({ ...job, vendorBrief }));

  return <VendorJobDetail job={serialized} />;
}
