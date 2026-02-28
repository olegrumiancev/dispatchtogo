import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewRequestForm } from "@/components/forms/new-request-form";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const properties = await prisma.property.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { name: "asc" },
  });

  return <NewRequestForm properties={properties} />;
}
