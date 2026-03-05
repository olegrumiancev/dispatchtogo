import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REQUEST_STATUSES, SERVICE_CATEGORIES, PRIORITY_LEVELS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertTriangle,
  Wrench,
  User,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Image as ImageIcon,
  Package,
} from "lucide-react";
import { JobActions } from "./job-actions";
import { RequestActions } from "./request-actions";

function getStatusColor(status: string) {
  return (
    REQUEST_STATUSES.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-800"
  );
}
function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}
function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}
function getPriorityLabel(priority: string) {
  return PRIORITY_LEVELS.find((p) => p.value === priority)?.label ?? priority;
}
function getPriorityColor(priority: string) {
  return PRIORITY_LEVELS.find((p) => p.value === priority)?.color ?? "bg-gray-100 text-gray-800";
}

function getJobStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    ACCEPTED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}

export default async function OperatorRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { organization: true },
  });
  if (!dbUser?.organization) redirect("/app/onboarding");

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      property: true,
      organization: true,
      jobs: {
        include: {
          vendor: { select: { companyName: true, contactName: true, email: true, phone: true } },
          invoice: true,
          completionPhotos: true,
          rejectionLogs: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: true,
      proofPacket: true,
    },
  });

  if (!request || request.organizationId !== dbUser.organization.id) notFound();

  const activeJob = request.jobs.find((j) =>
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(j.status)
  );
  const completedJobs = request.jobs.filter((j) => j.status === "COMPLETED");
  const rejectedJobs = request.jobs.filter((j) => j.status === "REJECTED");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back nav */}
      <Link
        href="/app/operator/requests"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={getStatusColor(request.status)}>
                  {getStatusLabel(request.status)}
                </Badge>
                <Badge variant={getPriorityColor(request.priority)}>
                  {getPriorityLabel(request.priority)}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{request.title}</h1>
              <p className="text-sm text-gray-500">
                Ref:{" "}
                <span className="font-mono font-medium text-gray-700">
                  {request.referenceNumber}
                </span>
              </p>
            </div>
            <RequestActions request={request} />
          </div>
        </CardContent>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {request.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" /> Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {request.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {request.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="w-4 h-4" /> Attachments ({request.attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {request.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"
                    >
                      {att.type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="w-full h-28 object-cover"
                        />
                      ) : (
                        <div className="w-full h-28 flex flex-col items-center justify-center bg-gray-50 gap-1">
                          <FileText className="w-6 h-6 text-gray-400" />
                          <span className="text-xs text-gray-500 px-2 truncate max-w-full">
                            {att.filename}
                          </span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="w-4 h-4" /> Jobs ({request.jobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.jobs.length === 0 ? (
                <p className="text-sm text-gray-400">No jobs dispatched yet.</p>
              ) : (
                request.jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    {/* Job header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getJobStatusColor(job.status)}>
                          {job.status.replace("_", " ")}
                        </Badge>
                        {job.vendor && (
                          <span className="text-sm text-gray-700 font-medium">
                            {job.vendor.companyName}
                          </span>
                        )}
                      </div>
                      {/* Actions only for active job */}
                      {activeJob?.id === job.id && (
                        <JobActions job={job} requestId={request.id} />
                      )}
                    </div>

                    {/* Vendor contact */}
                    {job.vendor && (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {job.vendor.contactName && (
                          <p>
                            <User className="inline w-3 h-3 mr-1" />
                            {job.vendor.contactName}
                          </p>
                        )}
                        {job.vendor.email && (
                          <p>
                            <span className="font-medium">Email:</span>{" "}
                            <a
                              href={`mailto:${job.vendor.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {job.vendor.email}
                            </a>
                          </p>
                        )}
                        {job.vendor.phone && (
                          <p>
                            <span className="font-medium">Phone:</span>{" "}
                            {job.vendor.phone}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Job notes */}
                    {job.notes && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Notes
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {job.notes}
                        </p>
                      </div>
                    )}

                    {/* Completion info */}
                    {job.completedAt && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed {formatDate(job.completedAt)}
                      </div>
                    )}

                    {/* Completion photos */}
                    {job.completionPhotos.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">
                          Completion Photos ({job.completionPhotos.length})
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {job.completionPhotos.map((photo) => (
                            <a
                              key={photo.id}
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.url}
                                alt="Completion photo"
                                className="w-full h-20 object-cover rounded border border-gray-200 hover:border-blue-400 transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoice */}
                    {job.invoice && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> Invoice
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">
                            {formatCurrency(job.invoice.amount)}
                          </span>
                          <Badge
                            variant={
                              job.invoice.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : job.invoice.status === "SENT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }
                          >
                            {job.invoice.status}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Rejection logs */}
                    {job.rejectionLogs.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejection History
                        </p>
                        {job.rejectionLogs.map((log) => (
                          <div key={log.id} className="bg-red-50 rounded p-2 text-xs text-red-700">
                            <p className="font-medium">{formatDate(log.createdAt)}</p>
                            <p>{log.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Proof Packet */}
          {request.proofPacket && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" /> Proof Packet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge
                      variant={
                        request.proofPacket.status === "READY"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {request.proofPacket.status}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      Generated {formatDate(request.proofPacket.createdAt)}
                    </p>
                  </div>
                  {request.proofPacket.status === "READY" && request.proofPacket.pdfUrl && (
                    <a
                      href={request.proofPacket.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Download PDF
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar — meta */}
        <div className="space-y-4">
          {/* Request Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Request Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Property</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">{request.property.name}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Category</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {getCategoryLabel(request.category)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Created</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-700">{formatDate(request.createdAt)}</p>
                </div>
              </div>
              {request.scheduledDate && (
                <div>
                  <p className="text-xs text-gray-400">Scheduled</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-700">
                      {formatDate(request.scheduledDate)}
                    </p>
                  </div>
                </div>
              )}
              {request.completedAt && (
                <div>
                  <p className="text-xs text-gray-400">Completed</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-sm text-gray-700">
                      {formatDate(request.completedAt)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Job Summary */}
          {activeJob && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Active Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={getJobStatusColor(activeJob.status)}>
                  {activeJob.status.replace("_", " ")}
                </Badge>
                {activeJob.vendor && (
                  <p className="text-sm text-gray-700">{activeJob.vendor.companyName}</p>
                )}
                {activeJob.scheduledAt && (
                  <p className="text-xs text-gray-500">
                    Scheduled: {formatDate(activeJob.scheduledAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Job Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Jobs</span>
                <span className="text-sm font-medium">{request.jobs.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Completed</span>
                <span className="text-sm font-medium text-emerald-600">
                  {completedJobs.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Rejected</span>
                <span className="text-sm font-medium text-red-600">
                  {rejectedJobs.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Admin notes */}
          {request.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Admin Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {request.adminNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
