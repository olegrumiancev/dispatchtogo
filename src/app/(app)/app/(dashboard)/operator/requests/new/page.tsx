import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewRequestForm } from "@/components/forms/new-request-form";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const properties = await prisma.property.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
    },
  });

  return <NewRequestForm properties={properties} />;
}
