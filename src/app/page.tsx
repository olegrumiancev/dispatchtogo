import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPage from "./(public)/landing/page";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
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

  return <LandingPage />;
}
