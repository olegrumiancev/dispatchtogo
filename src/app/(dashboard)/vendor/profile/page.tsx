import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Building2, MapPin, Phone, Mail, Star, CheckCircle, XCircle } from "lucide-react";
import VendorProfileForm from "@/components/forms/vendor-profile-form";

export const metadata = {
  title: "My Profile | DispatchToGo",
};

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function getCredentialTypeLabel(type: string) {
  const map: Record<string, string> = {
    TRADE_LICENSE: "Trade License",
    WSIB: "WSIB",
    INSURANCE_COI: "Insurance / COI",
    BUSINESS_LICENSE: "Business License",
    OTHER: "Other",
  };
  return map[type] ?? type;
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

  // Serialize vendor for client component (Dates → strings)
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
          {vendor.credentials.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No credentials on file. Contact support to add credentials.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      License Number
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Issuing Body
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Expiry Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vendor.credentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {getCredentialTypeLabel(cred.type)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">
                        {cred.credentialNumber ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 hidden md:table-cell">
                        {cred.type ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 hidden lg:table-cell">
                        {cred.expiresAt ? (
                          <span
                            className={
                              new Date(cred.expiresAt) < new Date()
                                ? "text-red-600 font-medium"
                                : ""
                            }
                          >
                            {formatDate(cred.expiresAt)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {cred.verified ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 text-xs">
                            <XCircle className="w-4 h-4" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
