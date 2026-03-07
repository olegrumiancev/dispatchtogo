import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Building2, Phone, Mail, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminCredentialVerifyButton } from "@/components/forms/admin-credential-verify-button";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export const metadata = { title: "Vendor Credentials | Admin | DispatchToGo" };

const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  TRADE_LICENSE: "Trade License",
  WSIB: "WSIB",
  INSURANCE_COI: "Insurance / COI",
  BUSINESS_LICENSE: "Business License",
  OTHER: "Other",
};

function labelFor(type: string) {
  return CREDENTIAL_TYPE_LABELS[type] ?? type;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-CA");
}

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      skills: true,
      credentials: { orderBy: { type: "asc" } },
      user: {
        where: { isDisabled: false },
        select: { id: true, name: true, email: true },
      },
      _count: { select: { jobs: true } },
    },
  });

  if (!vendor) redirect("/app/admin/vendors");

  const pendingCount = vendor.credentials.filter((c) => !c.verified).length;
  const verifiedCount = vendor.credentials.filter((c) => c.verified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/admin/vendors"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Back to vendors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{vendor.companyName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vendor · Credential Review</p>
        </div>
      </div>

      {/* Vendor summary */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <a href={`tel:${vendor.phone}`} className="hover:text-blue-600">{vendor.phone}</a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{vendor.email}</span>
            </div>
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{vendor.address}</span>
              </div>
            )}
          </div>
          {vendor.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {vendor.skills.map((s) => (
                <Badge key={s.id} className="bg-blue-50 text-blue-700 text-xs">
                  {getCategoryLabel(s.category)}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span>{vendor._count.jobs} jobs total</span>
            <span className="text-emerald-600 font-medium">{verifiedCount} verified</span>
            {pendingCount > 0 && (
              <span className="text-amber-600 font-medium">{pendingCount} pending review</span>
            )}
          </div>
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
              <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              This vendor has no credentials on file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Number</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expiry</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Document</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vendor.credentials.map((cred) => {
                    const isExpired = cred.expiresAt ? new Date(cred.expiresAt) < new Date() : false;
                    return (
                      <tr key={cred.id} className={`hover:bg-gray-50 ${isExpired ? "bg-red-50" : ""}`}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {labelFor(cred.type)}
                          {isExpired && (
                            <span className="ml-1.5 text-xs text-red-600 font-normal">(expired)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 hidden sm:table-cell font-mono text-xs">
                          {cred.credentialNumber}
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          {cred.expiresAt ? (
                            <span className={isExpired ? "text-red-600 font-medium" : "text-gray-600"}>
                              {formatDate(cred.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          {cred.documentUrl ? (
                            <a
                              href={cred.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              No document
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <AdminCredentialVerifyButton
                            vendorId={vendor.id}
                            credential={{
                              id: cred.id,
                              type: cred.type,
                              credentialNumber: cred.credentialNumber,
                              expiresAt: cred.expiresAt ? cred.expiresAt.toISOString() : null,
                              verified: cred.verified,
                              verifiedAt: cred.verifiedAt ? cred.verifiedAt.toISOString() : null,
                              documentUrl: cred.documentUrl ?? null,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor users */}
      {vendor.user.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendor.user.map((u) => (
                <div key={u.id} className="flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs flex-shrink-0">
                    {(u.name ?? u.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{u.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
