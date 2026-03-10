import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDispatchAssist } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const vendorId = new URL(request.url).searchParams.get("vendorId");

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
  }

  const [serviceRequest, vendor] = await Promise.all([
    prisma.serviceRequest.findUnique({ where: { id }, select: { id: true } }),
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, status: true } }),
  ]);

  if (!serviceRequest || !vendor) {
    return NextResponse.json(
      { error: "Request or vendor not found" },
      { status: 404 }
    );
  }

  if (vendor.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "This vendor is not active and cannot receive new dispatches." },
      { status: 409 }
    );
  }

  try {
    const assist = await generateDispatchAssist(id, vendorId);
    return NextResponse.json(assist);
  } catch (err) {
    console.error("[dispatch-assist] Error:", err);
    return NextResponse.json(
      { error: "Failed to prepare dispatch handoff" },
      { status: 500 }
    );
  }
}
