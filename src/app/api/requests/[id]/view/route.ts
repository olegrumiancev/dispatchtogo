import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: requestId } = await params;
  const userId = (session.user as any).id as string;

  await prisma.requestView.upsert({
    where: { userId_requestId: { userId, requestId } },
    update: {},
    create: { userId, requestId },
  });

  return NextResponse.json({ ok: true });
}
