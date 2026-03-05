import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { FileText, ExternalLink } from "lucide-react";

export const metadata = {
  title: "Proof Packets | DispatchToGo",
};

export default async function ProofPacketsPage() {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });

  if (!dbUser?.organization) redirect("/app/onboarding");
  const org = dbUser.organization;

  const packets = await prisma.proofPacket.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      serviceRequest: {
        select: {
          referenceNumber: true,
          title: true,
          property: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Proof Packets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download compiled PDF reports for completed service requests.
        </p>
      </div>

      {packets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No proof packets yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Proof packets are generated when service requests are completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Proof Packets ({packets.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Property
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Generated
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {packets.map((packet) => (
                    <tr key={packet.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {packet.serviceRequest.referenceNumber}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">
                          {packet.serviceRequest.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {packet.serviceRequest.property.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                        {formatDate(packet.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            packet.status === "READY"
                              ? "bg-emerald-100 text-emerald-700"
                              : packet.status === "GENERATING"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }
                        >
                          {packet.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {packet.status === "READY" && packet.pdfUrl ? (
                          <a
                            href={packet.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
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
