import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import {
  SMS_TEMPLATE_KEYS,
  DEFAULT_SMS_TEMPLATES,
  getSmsTemplates,
  type SmsTemplateKey,
} from "@/lib/sms-templates";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // ?section=sms-templates returns merged templates (DB + defaults)
  const { searchParams } = new URL(request.url);
  if (searchParams.get("section") === "sms-templates") {
    const templates = await getSmsTemplates();
    const defaults = DEFAULT_SMS_TEMPLATES;
    const payload = SMS_TEMPLATE_KEYS.map((key) => ({
      key,
      value: templates[key],
      isDefault: templates[key] === defaults[key],
    }));
    return NextResponse.json(payload);
  }

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();

  // Whitelist the fields that can be updated
  const BOOLEAN_FIELDS = [
    "emailVerification",
    "emailPasswordReset",
    "emailNewRegistration",
    "emailAccountApproved",
    "emailAccountRejected",
    "emailVendorDispatch",
    "emailOperatorStatusUpdate",
    "emailJobCompletion",
    "emailVendorRejection",
    "emailAdminRejection",
    "emailWelcome",
    "bccEnabled",
    "smsRedirectEnabled",
  ] as const;

  const STRING_FIELDS = ["bccAddresses", "smsRedirectNumber"] as const;

  const data: Record<string, any> = {};

  for (const key of BOOLEAN_FIELDS) {
    if (typeof body[key] === "boolean") {
      data[key] = body[key];
    }
  }
  for (const key of STRING_FIELDS) {
    if (typeof body[key] === "string") {
      data[key] = body[key];
    }
  }

  // Handle SMS template updates: { smsTemplate: { key, value } }
  // Pass value of null to reset to default (removes key from DB map)
  if (body.smsTemplate && typeof body.smsTemplate === "object") {
    const { key, value } = body.smsTemplate as { key: string; value: string | null };
    if (SMS_TEMPLATE_KEYS.includes(key as SmsTemplateKey)) {
      const row = await (prisma.systemSettings.findUnique as any)({
        where: { id: "singleton" },
        select: { smsTemplates: true },
      });
      const existing =
        row && typeof row.smsTemplates === "object" && row.smsTemplates !== null
          ? (row.smsTemplates as Record<string, string>)
          : {};
      if (value === null) {
        delete existing[key];
      } else {
        existing[key] = value;
      }
      const updated = await (prisma.systemSettings.upsert as any)({
        where: { id: "singleton" },
        create: { id: "singleton", smsTemplates: existing },
        update: { smsTemplates: existing },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Unknown template key" }, { status: 400 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  return NextResponse.json(updated);
}
