import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;

  switch (role) {
    case "ADMIN":
      redirect("/admin");
    case "VENDOR":
      redirect("/vendor/jobs");
    case "OPERATOR":
    default:
      redirect("/operator");
  }
}
