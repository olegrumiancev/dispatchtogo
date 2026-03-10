import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminDispatchBoardClient } from "./dispatch-board-client";
import { getAdminDispatchBoardData, type AdminDispatchBoardSearchParams } from "@/lib/admin-dispatch-board";

export default async function DispatchBoardPage({
  searchParams,
}: {
  searchParams: Promise<AdminDispatchBoardSearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const params = await searchParams;
  const initialData = await getAdminDispatchBoardData(params);

  return <AdminDispatchBoardClient key={initialData.queryString || "default"} initialData={initialData} />;
}
