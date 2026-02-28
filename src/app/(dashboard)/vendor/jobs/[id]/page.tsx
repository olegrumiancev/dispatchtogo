import { redirect, notFound } from "next/navigation";
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
  if (user.role !== "VENDOR") redirect("/");

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { uploadedAt: "asc" } },
      request: {
        include: {
          property: { select: { name: true, address: true } },
          operator: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!job || job.vendorId !== user.vendorId) notFound();

  // Serialize dates for the client component
  const serializedJob = JSON.parse(JSON.stringify(job));

  return <VendorJobDetail job={serializedJob} />;
}
