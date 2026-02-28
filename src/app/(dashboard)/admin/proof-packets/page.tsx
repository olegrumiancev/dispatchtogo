import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Package } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Proof Packets | DispatchToGo Admin",
};

export default async function AdminProofPacketsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  // Fetch all completed/verified service requests across all organizations
  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: { in: ["COMPLETED", "VERIFIED"] },
      job: { isNot: null },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      organization: { select: { name: true } },
      property: true,
      job: {
        include: {
          vendor: { select: { companyName: true } },
          proofPacket: true,
        },
      },
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proof Packets</h1>
          <p className="text-sm text-gray-500 mt-1">
            All completed jobs across all organizations — admin view.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="w-4 h-4" />
          <span>
            {requests.length} completed job{requests.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content */}
      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No completed jobs yet</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Once a service request reaches the Completed or Verified status, proof packets will
              appear here.
            </p>
            <Link
              href="/admin/dispatch"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dispatch Board
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Completed Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">
                      Organization
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">
                      Property
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                      Vendor
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">
                      Completed
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{req.referenceNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {req.organization.name}
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden md:table-cell">
                        <span className="font-medium">{req.property.name}</span>
                        {req.property.address && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">
                            {req.property.address}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 hidden lg:table-cell">
                        {req.job?.vendor.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">
                        {req.job?.completedAt ? formatDate(req.job.completedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                        {req.job?.totalCost != null ? formatCurrency(req.job.totalCost) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            req.status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {req.status === "VERIFIED" ? "Verified" : "Completed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.job && (
                          <a
                            href={`/api/proof-packets/${req.job.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
