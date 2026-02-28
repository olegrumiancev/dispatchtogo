import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REQUEST_STATUSES, URGENCY_LEVELS } from "@/lib/constants";
import { ShieldCheck, Download, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

export default async function ProofPacketsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  // Only show completed requests for this operator's org
  const completedRequests = await prisma.serviceRequest.findMany({
    where: {
      organizationId: user.organizationId,
      status: "COMPLETED",
    },
    include: {
      property: { select: { name: true, address: true } },
      job: {
        include: {
          vendor: { select: { companyName: true, phone: true } },
          photos: { select: { id: true, url: true, uploadedAt: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proof Packets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Downloadable proof-of-service records for completed requests.
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {completedRequests.length} completed
        </span>
      </div>

      {completedRequests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No completed requests yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Proof packets will appear here once jobs are completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completedRequests.map((req) => (
            <Card key={req.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {req.referenceNumber}
                      </span>
                      <Badge variant={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                      {req.job && (
                        <Badge className="bg-green-100 text-green-800">
                          {req.job.photos.length} photo{req.job.photos.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {req.property.name}
                      {req.job?.vendor && ` · ${req.job.vendor.companyName}`}
                      {` · Completed ${formatDate(req.updatedAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/operator/requests/${req.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
                        View
                      </Button>
                    </Link>
                    <a
                      href={`/api/proof-packets/${req.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        <Download className="w-4 h-4" />
                        Proof Packet
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
