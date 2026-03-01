import { NextResponse } from "next/server";
import { isEmailConfigured, checkEmailHealth } from "@/lib/email";

export async function GET() {
  if (!isEmailConfigured()) {
    return NextResponse.json({ status: "not_configured" }, { status: 200 });
  }

  const error = await checkEmailHealth();
  if (error) {
    return NextResponse.json({ status: "error", error }, { status: 200 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
