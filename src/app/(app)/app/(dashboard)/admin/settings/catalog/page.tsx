import { redirect } from "next/navigation";

export const metadata = {
  title: "Catalog Settings | DispatchToGo Admin",
};

export default async function AdminCatalogSettingsPage() {
  redirect("/app/admin/settings?tab=catalog");
}
