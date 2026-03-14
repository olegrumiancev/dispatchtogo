import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/email-templates";
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
      const reviewUrl = `${appUrl}/admin/users`;

      for (const admin of admins) {
        const { subject, html } = await renderEmailTemplate("newRegistration", {
          adminName: admin.name || "Admin",
          userName: user.name || user.email,
          userEmail: user.email,
          roleName,
          organizationLabel: user.role === "OPERATOR" ? "Organization" : "Company",
          organizationValue: orgOrCompany,
          organizationRow: orgOrCompany
            ? {
                value: `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold">${user.role === "OPERATOR" ? "Organization" : "Company"}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${orgOrCompany}</td></tr>`,
                safe: true,
              }
            : "",
          reviewUrl,
        });
        sendEmail(
          admin.email,
          subject,
          html,
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
