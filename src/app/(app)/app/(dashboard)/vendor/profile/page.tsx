import { redirect } from "next/navigation";

export const metadata = {
  title: "Company Profile | DispatchToGo",
};

export default function VendorProfileRedirectPage() {
  redirect("/app/vendor/company");
}
