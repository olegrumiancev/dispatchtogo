/**
 * GET /api/unsubscribe?token=<unsubscribeToken>
 *
 * One-click unsubscribe from digest emails. No authentication required —
 * the token is the credential. Sets digestEnabled=false on the user's
 * notification preferences.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(unsubscribeHtml("Invalid Link", "This unsubscribe link is missing a token."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const prefs = await prisma.userNotificationPreferences.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, digestEnabled: true },
  });

  if (!prefs) {
    return new NextResponse(unsubscribeHtml("Invalid Link", "This unsubscribe link is not valid or has already been used."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!prefs.digestEnabled) {
    return new NextResponse(
      unsubscribeHtml("Already Unsubscribed", "You have already been unsubscribed from digest emails."),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  }

  await prisma.userNotificationPreferences.update({
    where: { id: prefs.id },
    data: { digestEnabled: false },
  });

  return new NextResponse(
    unsubscribeHtml(
      "Unsubscribed",
      "You have been successfully unsubscribed from DispatchToGo digest emails. You can re-enable them at any time from your account settings."
    ),
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

function unsubscribeHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – DispatchToGo</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
    h1 { font-size: 22px; margin: 0 0 12px; color: #111827; }
    p { color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #1e40af; color: #fff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://app.dispatchtogo.com/app/login">Back to DispatchToGo</a>
  </div>
</body>
</html>`;
}
