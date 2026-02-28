import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Building2, MapPin, Phone, Mail, Star } from "lucide-react";
import VendorProfileForm from "@/components/forms/vendor-profile-form";
import VendorCredentialsForm from "@/components/forms/vendor-credentials-form";

export const metadata = {
  title: "My Profile | DispatchToGo",
};

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default async function VendorProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;

  if (!vendorId) redirect("/vendor/jobs");

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

  if (!vendor) redirect("/vendor/jobs");

  const vendorForForm = {
    id: vendor.id,
    companyName: vendor.companyName,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address ?? "",
    serviceRadiusKm: vendor.serviceRadiusKm ?? 0,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your company information and credentials.
        </p>
      </div>

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

      {/* Company info card */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Company Name</p>
                <p className="text-sm font-medium text-gray-900">{vendor.companyName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Contact Name</p>
                <p className="text-sm font-medium text-gray-900">{vendor.contactName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{vendor.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm text-gray-900">{vendor.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-gray-900">{vendor.address ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Service Radius</p>
                <p className="text-sm text-gray-900">{vendor.serviceRadiusKm} km</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          {vendor.skills.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Skills / Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {vendor.skills.map((skill) => (
                  <Badge key={skill.id} variant="bg-blue-100 text-blue-700">
                    {getCategoryLabel(skill.category)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorProfileForm vendor={vendorForForm} />
        </CardContent>
      </Card>

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
    </div>
  );
}
