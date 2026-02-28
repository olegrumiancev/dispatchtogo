import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VendorJobDetail } from "@/components/forms/vendor-job-detail";

export default async function VendorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      serviceRequest: {
        include: {
          property: {
            include: {
              contacts: true,
            },
          },
          photos: true,
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
    redirect("/vendor/jobs");
  }

  // Serialize dates so they can be passed to client components
  const serialized = JSON.parse(JSON.stringify(job));

  return <VendorJobDetail job={serialized} />;
}
