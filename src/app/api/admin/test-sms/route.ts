import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSMS } from "@/lib/sms";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { phone, message } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    );
  }

  const result = await sendSMS(phone as string, message as string);

  if (result.success) {
    return NextResponse.json({ success: true, sid: result.sid });
  } else {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }
}
