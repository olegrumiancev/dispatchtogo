import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileText, Download, Package } from "lucide-react";
import Link from "next/link";

export default async function ProofPacketsPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const packets = await prisma.proofPacket.findMany({
    include: {
      serviceRequest: {
        include: {
          organization: { select: { name: true } },
          property: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proof Packets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated proof-of-service documents for completed jobs.
        </p>
      </div>

      {packets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No proof packets generated yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Organization</th>
                <th className="text-left px-4 py-3">Property</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {packets.map((packet) => (
                <tr key={packet.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {packet.serviceRequest.referenceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {packet.serviceRequest.organization.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {packet.serviceRequest.property.name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        packet.status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : packet.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {packet.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(packet.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/api/admin/proof-packets/${packet.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View
                      </Link>
                      <Link
                        href={`/api/admin/proof-packets/${packet.id}?download=true`}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
