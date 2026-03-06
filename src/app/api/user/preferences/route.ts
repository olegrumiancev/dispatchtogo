/**
 * GET  /api/user/preferences  — return the caller's notification preferences
 * PATCH /api/user/preferences  — update digestEnabled, digestFrequency, smsOptOut, emailOptOut
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreatePreferences, updatePreferences } from "@/lib/user-preferences";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  const prefs = await getOrCreatePreferences(user.id);
  // Never expose the unsubscribeToken over the API
  const { unsubscribeToken: _t, ...safe } = prefs as any;
  return NextResponse.json(safe);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as any;
  const body = await request.json();

  const ALLOWED_KEYS = ["digestEnabled", "digestFrequency", "smsOptOut", "emailOptOut"] as const;
  const VALID_FREQUENCIES = ["DAILY", "NONE"];

  const data: Record<string, any> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      if (key === "digestFrequency") {
        if (!VALID_FREQUENCIES.includes(body[key])) {
          return NextResponse.json(
            { error: `digestFrequency must be one of: ${VALID_FREQUENCIES.join(", ")}` },
            { status: 400 }
          );
        }
        data[key] = body[key];
      } else {
        // Boolean fields
        if (typeof body[key] !== "boolean") {
          return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
        }
        data[key] = body[key];
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const updated = await updatePreferences(user.id, data);
  const { unsubscribeToken: _t, ...safe } = updated as any;
  return NextResponse.json(safe);
}
