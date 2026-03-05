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
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "VENDOR") redirect("/");

  const { id } = await params;

  const job = (await prisma.job.findFirst({
    where: { id, vendorId: user.vendorProfileId },
    include: {
      serviceRequest: {
        include: { property: true, photos: true },
      },
      notes: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      photos: true,
      materials: true,
    },
  })) as any;

  if (!job) notFound();

  return <VendorJobDetail job={job} />;
}
