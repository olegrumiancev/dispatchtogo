import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NOTIFICATION_SETTINGS } from "@/lib/notification-config";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/app/login?error=invalid-verification", request.url)
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/app/login?error=invalid-verification", request.url)
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // For non-admin users, notify all admins that a new account is awaiting approval
    if (user.role !== "ADMIN" && NOTIFICATION_SETTINGS.emailEnabled) {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", emailVerified: true, isApproved: true },
        select: { email: true, name: true },
      });

      // Get extra context for the notification
      let orgOrCompany = "";
      if (user.role === "OPERATOR" && user.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { name: true },
        });
        orgOrCompany = org?.name ?? "";
      } else if (user.role === "VENDOR" && user.vendorId) {
        const vendor = await prisma.vendor.findUnique({
          where: { id: user.vendorId },
          select: { companyName: true },
        });
        orgOrCompany = vendor?.companyName ?? "";
      }

      const appUrl = process.env.NEXTAUTH_URL || "https://dispatchtogo.com";
      const roleName = user.role === "OPERATOR" ? "Property Operator" : "Service Vendor";

      for (const admin of admins) {
        sendEmail(
          admin.email,
          `New Registration Awaiting Approval — ${user.name || user.email}`,
          `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1e40af;color:#fff;padding:20px;border-radius:8px 8px 0 0">
              <h1 style="margin:0;font-size:20px">DispatchToGo</h1>
            </div>
            <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <h2 style="margin:0 0 16px">New Account Pending Approval</h2>
              <p>Hi ${admin.name || "Admin"},</p>
              <p>A new user has verified their email and is waiting for your approval to access the platform.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;width:140px">Name</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${user.name || "—"}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Email</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${user.email}</td></tr>
                <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">Role</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${roleName}</td></tr>
                ${orgOrCompany ? `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${user.role === "OPERATOR" ? "Organization" : "Company"}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${orgOrCompany}</td></tr>` : ""}
              </table>
              <a href="${appUrl}/admin/users" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;font-weight:bold">Review & Approve</a>
              <p style="color:#6b7280;font-size:13px;margin-top:24px">The user cannot log in until you approve their account.</p>
            </div>
          </div>`,
          undefined,
          { eventKey: "emailNewRegistration" }
        ).then((r) => {
          if (!r.success) console.error(`[verify-email] Admin notification failed for ${admin.email}:`, r.error);
        });
      }
    }

    // Redirect based on role: admins go straight to login, others see a pending message
    if (user.role === "ADMIN") {
      return NextResponse.redirect(
        new URL("/app/login?verified=true", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/app/login?verified=true&pending=true", request.url)
    );
  } catch (error) {
    console.error("[GET /api/auth/verify-email]", error);
    return NextResponse.redirect(
      new URL("/app/login?error=verification-failed", request.url)
    );
  }
}
