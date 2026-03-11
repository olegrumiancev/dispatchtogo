import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { REQUEST_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  Download,
  ExternalLink,
  Paperclip,
  Camera,
  FileText,
} from "lucide-react";

export const metadata = {
  title: "Proof Packets | DispatchToGo Vendor",
};

const PAGE_SIZE = 25;

function getStatusColor(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export default async function VendorProofPacketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  const vendorId: string = user.vendorId!;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    vendorId,
    completedAt: { not: null },
    serviceRequest: {
      status: { in: ["COMPLETED", "VERIFIED"] as string[] },
    },
  };

  const [total, jobs] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      orderBy: { completedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        proofPacket: { select: { id: true } },
        _count: { select: { photos: true } },
        serviceRequest: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            updatedAt: true,
            property: { select: { name: true, address: true } },
            _count: { select: { photos: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proof Packets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Completed proof-of-service packets for your finished jobs.
          </p>
        </div>
        <span className="text-sm text-gray-500">{total} completed</span>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-500">No proof packets yet.</p>
            <p className="mt-1 text-sm text-gray-400">
              Completed jobs will appear here once a packet can be generated.
            </p>
            <Link href="/app/vendor/jobs?tab=completed" className="mt-5 inline-flex">
              <Button variant="secondary">View Completed Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Completed Proof History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-gray-600 md:table-cell">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Evidence</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-gray-600 lg:table-cell">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => {
                    const req = job.serviceRequest;
                    return (
                      <tr key={job.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{req.referenceNumber}</p>
                            <p className="text-xs text-gray-500 md:hidden">
                              {req.property.name}
                            </p>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-gray-700 md:table-cell">
                          <span className="font-medium">{req.property.name}</span>
                          {req.property.address && (
                            <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400">
                              {req.property.address}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span
                              title={`${req._count.photos} intake photo${req._count.photos !== 1 ? "s" : ""}`}
                              className="inline-flex items-center gap-1"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                              {req._count.photos}
                            </span>
                            <span
                              title={`${job._count.photos} vendor photo${job._count.photos !== 1 ? "s" : ""}`}
                              className="inline-flex items-center gap-1"
                            >
                              <Camera className="h-3.5 w-3.5 text-teal-500" />
                              {job._count.photos}
                            </span>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-gray-500 lg:table-cell">
                          {job.completedAt ? formatDate(job.completedAt) : formatDate(req.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusColor(req.status)}>
                            {getStatusLabel(req.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/app/vendor/jobs/${job.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                                View
                              </Button>
                            </Link>
                            <a
                              href={`/api/proof-packets/${job.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="secondary" size="sm">
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {job.proofPacket ? "Download PDF" : "Generate PDF"}
                                </span>
                                <span className="sm:hidden">PDF</span>
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <p>
              Proof packets include intake photos, vendor photos, notes, and completion details for each finished job.
            </p>
          </div>
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/app/vendor/proof-packets"
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
