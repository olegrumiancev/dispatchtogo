import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/notifications  – mark one or all of the current user's notifications as read */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await request.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (id) {
    // Mark a single notification as read – must belong to the current user
    const notif = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!notif) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.notification.update({ where: { id }, data: { read: true } });
  } else {
    // Mark all of the current user's notifications as read
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
