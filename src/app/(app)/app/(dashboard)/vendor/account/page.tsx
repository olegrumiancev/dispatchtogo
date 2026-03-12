import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MyAccountPage } from "@/components/account/my-account-page";

export const metadata = {
  title: "My Account | DispatchToGo",
};

export default async function VendorAccountPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "VENDOR") redirect("/app/login");

  return (
    <MyAccountPage
      userId={user.id}
      relatedSettings={{
        href: "/app/vendor/company",
        label: "Open Company Profile",
        description: "Availability, credentials, and customer-facing company details are managed separately from your login account.",
      }}
    />
  );
}
