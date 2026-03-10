import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminDispatchBoardData } from "@/lib/admin-dispatch-board";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const data = await getAdminDispatchBoardData({
    status: searchParams.get("status") ?? undefined,
    urgency: searchParams.get("urgency") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    org: searchParams.get("org") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
