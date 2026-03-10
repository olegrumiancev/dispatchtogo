import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { CredentialAssist } from "@/lib/ai-assist";
import { AI_ARTIFACT_ACTIONS, getLatestAiArtifactsForEntities } from "@/lib/ai-artifacts";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminAccountsSubnav } from "@/components/admin/accounts-subnav";
import { XCircle, FileText, Building2, Phone, Mail, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdminCredentialVerifyButton } from "@/components/forms/admin-credential-verify-button";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { getVendorStatusMeta } from "@/lib/vendor-lifecycle";
import { VendorLifecycleActions } from "./vendor-lifecycle-actions";

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

  const credentialAssistMap = await getLatestAiArtifactsForEntities<CredentialAssist>(
    "VENDOR_CREDENTIAL",
    vendor.credentials.map((credential) => credential.id),
    AI_ARTIFACT_ACTIONS.CREDENTIAL_REVIEW
  );

  const pendingCount = vendor.credentials.filter((c) => !c.verified).length;
  const verifiedCount = vendor.credentials.filter((c) => c.verified).length;
  const vendorStatus = getVendorStatusMeta(vendor.status);

  return (
    <div className="space-y-6">
      <AdminAccountsSubnav />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/admin/vendors"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Back to vendors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{vendor.companyName}</h1>
              <Badge variant={vendorStatus.color}>{vendorStatus.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">Vendor credential review</p>
          </div>
        </div>
        <VendorLifecycleActions
          vendorId={vendor.id}
          vendorName={vendor.companyName}
          status={vendor.status}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${vendor.phone}`} className="hover:text-blue-600">
                {vendor.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{vendor.email}</span>
            </div>
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{vendor.address}</span>
              </div>
            )}
          </div>

          {(vendor.statusReason || vendor.suspendedAt || vendor.offboardedAt) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {vendor.statusReason && <p>{vendor.statusReason}</p>}
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500">
                {vendor.suspendedAt && <span>Suspended: {formatDate(vendor.suspendedAt)}</span>}
                {vendor.offboardedAt && <span>Offboarded: {formatDate(vendor.offboardedAt)}</span>}
              </div>
            </div>
          )}

          {vendor.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {vendor.skills.map((skill) => (
                <Badge key={skill.id} className="bg-blue-50 text-xs text-blue-700">
                  {getCategoryLabel(skill.category)}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex gap-4 border-t border-gray-100 pt-1 text-xs text-gray-500">
            <span>{vendor._count.jobs} jobs total</span>
            <span className="font-medium text-emerald-600">{verifiedCount} verified</span>
            {pendingCount > 0 && (
              <span className="font-medium text-amber-600">{pendingCount} pending review</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credentials &amp; Licenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vendor.credentials.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              This vendor has no credentials on file.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">Number</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">Expiry</th>
                    <th className="hidden px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vendor.credentials.map((cred) => {
                    const isExpired = cred.expiresAt ? new Date(cred.expiresAt) < new Date() : false;
                    const assist = credentialAssistMap[cred.id]?.data;

                    return (
                      <tr key={cred.id} className={`hover:bg-gray-50 ${isExpired ? "bg-red-50" : ""}`}>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {labelFor(cred.type)}
                          {isExpired && (
                            <span className="ml-1.5 text-xs font-normal text-red-600">(expired)</span>
                          )}
                        </td>
                        <td className="hidden px-6 py-4 font-mono text-xs text-gray-600 sm:table-cell">
                          {cred.credentialNumber}
                        </td>
                        <td className="hidden px-6 py-4 lg:table-cell">
                          {cred.expiresAt ? (
                            <span className={isExpired ? "font-medium text-red-600" : "text-gray-600"}>
                              {formatDate(cred.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="hidden px-6 py-4 md:table-cell">
                          {cred.documentUrl ? (
                            <div className="space-y-2">
                              <a
                                href={cred.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                View
                              </a>
                              {assist && (
                                <div className="space-y-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                                  <p className="font-medium">AI review draft</p>
                                  {assist.holderName && <p>Holder: {assist.holderName}</p>}
                                  {assist.extractedType && <p>Type: {labelFor(assist.extractedType)}</p>}
                                  {assist.extractedNumber && <p>Number: {assist.extractedNumber}</p>}
                                  {assist.expiresAt && <p>Expiry: {formatDate(assist.expiresAt)}</p>}
                                  {assist.flags.length > 0 && (
                                    <ul className="space-y-1 text-blue-800">
                                      {assist.flags.map((flag, index) => (
                                        <li key={index}>- {flag}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <XCircle className="h-3.5 w-3.5" />
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

      {vendor.user.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Vendor Users</CardTitle>
              <Link
                href={`/app/admin/users?vendor=${vendor.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Open in Users
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vendor.user.map((account) => (
                <div key={account.id} className="flex items-center gap-3 text-sm">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                    {(account.name ?? account.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.name ?? "-"}</p>
                    <p className="text-xs text-gray-500">{account.email}</p>
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
