import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCompletionAssist } from "@/lib/ai-assist";
import { prisma } from "@/lib/prisma";
import { ensureVendorIsActiveForMutation } from "@/lib/vendor-lifecycle";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      vendorId: true,
      organizationId: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (user.role === "VENDOR" && job.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (user.role === "VENDOR") {
    const guard = await ensureVendorIsActiveForMutation(job.vendorId);
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (user.role === "OPERATOR" && job.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const assist = await generateCompletionAssist(id);
    return NextResponse.json(assist);
  } catch (err) {
    console.error("[completion-assist] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate completion assist" },
      { status: 500 }
    );
  }
}
