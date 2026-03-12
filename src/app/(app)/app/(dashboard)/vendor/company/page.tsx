import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountPageShell } from "@/components/account/account-page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VendorCompanyProfileCard from "@/components/forms/vendor-company-profile-card";
import VendorCredentialsForm from "@/components/forms/vendor-credentials-form";
import { VendorAvailabilityToggle } from "@/components/forms/vendor-availability-toggle";
import { VENDOR_AVAILABILITY_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Company Profile | DispatchToGo",
};

function getAvailabilityConfig(status: string) {
  return VENDOR_AVAILABILITY_STATUSES.find((s) => s.value === status) ?? VENDOR_AVAILABILITY_STATUSES[0];
}

export default async function VendorCompanyPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;

  if (!vendorId) redirect("/app/vendor/jobs");

  const [vendor, totalJobs, completedJobs] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        skills: true,
        credentials: { orderBy: { type: "asc" } },
      },
    }),
    prisma.job.count({ where: { vendorId } }),
    prisma.job.count({ where: { vendorId, completedAt: { not: null } } }),
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
    multipleTeams: vendor.multipleTeams,
  };

  const availConfig = getAvailabilityConfig(vendor.availabilityStatus);

  return (
    <AccountPageShell
      title="Company Profile"
      description="Manage your company information, availability, and credentials. Personal sign-in settings live in My Account."
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Availability</CardTitle>
            <Badge variant={availConfig.color}>{availConfig.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-gray-500">
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalJobs}</p>
            <p className="mt-1 text-xs text-gray-500">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{completedJobs}</p>
            <p className="mt-1 text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0}%
            </p>
            <p className="mt-1 text-xs text-gray-500">Completion Rate</p>
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
              verifiedAt: c.verifiedAt ? c.verifiedAt.toISOString() : null,
              documentUrl: c.documentUrl ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </AccountPageShell>
  );
}
