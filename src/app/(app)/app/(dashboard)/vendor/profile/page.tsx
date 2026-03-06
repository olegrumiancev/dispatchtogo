import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES, VENDOR_AVAILABILITY_STATUSES } from "@/lib/constants";
import { Building2, MapPin, Phone, Mail, Star } from "lucide-react";
import VendorProfileForm from "@/components/forms/vendor-profile-form";
import VendorCredentialsForm from "@/components/forms/vendor-credentials-form";
import VendorCompanyProfileCard from "@/components/forms/vendor-company-profile-card";
import { VendorAvailabilityToggle } from "@/components/forms/vendor-availability-toggle";
import AccountNotificationSettings from "@/components/forms/account-notification-settings";
import { getOrCreatePreferences } from "@/lib/user-preferences";

export const metadata = {
  title: "My Profile | DispatchToGo",
};

function getAvailabilityConfig(status: string) {
  return VENDOR_AVAILABILITY_STATUSES.find((s) => s.value === status) ?? VENDOR_AVAILABILITY_STATUSES[0];
}

export default async function VendorProfilePage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;

  if (!vendorId) redirect("/app/vendor/jobs");

  const [vendor, totalJobs, completedJobs, notifPrefs] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        skills: true,
        credentials: { orderBy: { type: "asc" } },
      },
    }),
    prisma.job.count({ where: { vendorId } }),
    prisma.job.count({ where: { vendorId, completedAt: { not: null } } }),
    getOrCreatePreferences(user.id),
  ]);

  if (!vendor) redirect("/app/vendor/jobs");

  const vendorForForm = {
    id: vendor.id,
    companyName: vendor.companyName,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address ?? "",
    serviceRadiusKm: vendor.serviceRadiusKm ?? 0,
    categories: vendor.skills.map((s) => s.category),
  };

  const availConfig = getAvailabilityConfig(vendor.availabilityStatus);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your company information, availability, and credentials.
        </p>
      </div>

      {/* Availability — top of page, most important */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Availability</CardTitle>
            <Badge variant={availConfig.color}>
              {availConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Set your current availability. When you are not &ldquo;Available&rdquo;, new jobs will not be auto-dispatched to you.
          </p>
        </CardHeader>
        <CardContent>
          <VendorAvailabilityToggle
            vendorId={vendor.id}
            currentStatus={vendor.availabilityStatus}
            currentNote={vendor.availabilityNote}
          />
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
            <p className="text-xs text-gray-500 mt-1">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{completedJobs}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      <VendorCompanyProfileCard
        vendorDisplay={{
          companyName: vendor.companyName,
          contactName: vendor.contactName,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          serviceRadiusKm: vendor.serviceRadiusKm,
          skills: vendor.skills,
        }}
        vendorForm={vendorForForm}
      />

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Credentials &amp; Licenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <VendorCredentialsForm
            vendorId={vendorId}
            credentials={vendor.credentials.map((c) => ({
              id: c.id,
              type: c.type,
              credentialNumber: c.credentialNumber,
              expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
              verified: c.verified,
            }))}
          />
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <AccountNotificationSettings
        initialPrefs={{
          digestEnabled: notifPrefs.digestEnabled,
          digestFrequency: notifPrefs.digestFrequency,
          smsOptOut: notifPrefs.smsOptOut,
          emailOptOut: notifPrefs.emailOptOut,
        }}
      />
    </div>
  );
}
