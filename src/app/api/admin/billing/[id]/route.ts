import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPlatformBill, voidPlatformBill, previewPlatformBill } from "@/lib/billing";

/**
 * POST /api/admin/billing/[id]/action
 * body: { action: "send" | "void" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "send") {
      await sendPlatformBill(id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "void") {
      await voidPlatformBill(id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "preview") {
      const url = await previewPlatformBill(id);
      return NextResponse.json({ ok: true, url });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
