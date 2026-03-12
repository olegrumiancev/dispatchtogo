import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MyAccountPage } from "@/components/account/my-account-page";

export const metadata = {
  title: "My Account | DispatchToGo",
};

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/app/login");

  return <MyAccountPage userId={user.id} />;
}
