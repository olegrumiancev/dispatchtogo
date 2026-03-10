import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { ArrowLeft, MapPin, Calendar, Phone, Mail, User, CheckCircle, Download, Image } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import AssignModal from "../assign-modal";

function getUrgencyColor(urgency: string) {
  return URGENCY_LEVELS.find((u) => u.value === urgency)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusColor(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.color ?? "bg-gray-100 text-gray-800";
}

function getStatusLabel(status: string) {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

function getCategoryLabel(category: string) {
  return SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

const STATUS_PROGRESSION = [
  "SUBMITTED",
  "TRIAGING",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
] as const;

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_PROGRESSION.indexOf(currentStatus as any);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STATUS_PROGRESSION.map((status, idx) => {
        const isDone = currentIdx >= idx;
        const isCurrent = currentIdx === idx;
        return (
          <div key={status} className="flex items-center gap-1">
            <div
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                isCurrent
                  ? "bg-blue-100 text-blue-800 ring-2 ring-blue-300"
                  : isDone
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone && <CheckCircle className="w-3 h-3" />}
              {getStatusLabel(status)}
            </div>
            {idx < STATUS_PROGRESSION.length - 1 && (
              <span className="text-gray-300 text-xs">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function AdminDispatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/app/login");

  const user = session.user as any;
  if (user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const [req, availableVendors] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        property: { select: { name: true, address: true } },
        organization: { select: { name: true, contactEmail: true, contactPhone: true } },
        job: {
          include: {
            vendor: true,
            notes: {
              include: { author: { select: { name: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
            photos: { select: { id: true } },
            proofPacket: { select: { id: true } },
          },
        },
      },
    }),
    prisma.vendor.findMany({
      where: { isActive: true },
      include: { skills: { select: { category: true } } },
      orderBy: { companyName: "asc" },
    }),
  ]);

  if (!req) notFound();

  const job = req.job as any;
  const isUnassigned = !job || job.status === "DECLINED";

  const vendorsForModal = availableVendors.map((v) => ({
    id: v.id,
    companyName: v.companyName,
    phone: v.phone,
    availabilityStatus: v.availabilityStatus,
    availabilityNote: v.availabilityNote,
    skills: v.skills.map((s: any) => ({ category: s.category })),
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/app/admin/dispatch"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dispatch Board
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{req.referenceNumber}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={getUrgencyColor(req.urgency)}>{req.urgency}</Badge>
            <Badge variant={getStatusColor(req.status)}>{getStatusLabel(req.status)}</Badge>
            {job?.isPaused && (
              <Badge variant="bg-amber-100 text-amber-800">⏸ Paused</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isUnassigned && (
            <AssignModal
              requestRef={req.referenceNumber}
              requestId={req.id}
              vendors={vendorsForModal}
            />
          )}
          {(req.status === "COMPLETED" || req.status === "VERIFIED") && job?.proofPacket && (
            <a
              href={`/api/proof-packets/${job.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4" />
                Proof Packet
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusTimeline currentStatus={req.status === "DISPUTED" ? req.status : req.status} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500 pt-2">
            <div>
              <p className="font-medium text-gray-700">Submitted</p>
              <p>{formatDate(req.createdAt)}</p>
            </div>
            {job?.acceptedAt && (
              <div>
                <p className="font-medium text-gray-700">Accepted</p>
                <p>{formatDate(job.acceptedAt)}</p>
              </div>
            )}
            {job?.enRouteAt && (
              <div>
                <p className="font-medium text-gray-700">En Route</p>
                <p>{formatDate(job.enRouteAt)}</p>
              </div>
            )}
            {job?.arrivedAt && (
              <div>
                <p className="font-medium text-gray-700">Arrived</p>
                <p>{formatDate(job.arrivedAt)}</p>
              </div>
            )}
            {job?.completedAt && (
              <div>
                <p className="font-medium text-gray-700">Completed</p>
                <p>{formatDate(job.completedAt)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</p>
              <p className="text-sm text-gray-900 mt-1">{req.organization.name}</p>
              {req.organization.contactEmail && (
                <a href={`mailto:${req.organization.contactEmail}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {req.organization.contactEmail}
                </a>
              )}
              {req.organization.contactPhone && (
                <a href={`tel:${req.organization.contactPhone}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {req.organization.contactPhone}
                </a>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Property</p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-sm text-gray-900">{req.property.name}</p>
              </div>
              {req.property.address && (
                <p className="text-xs text-gray-500 mt-0.5 ml-5">{req.property.address}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</p>
              <p className="text-sm text-gray-900 mt-1">{getCategoryLabel(req.category)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</p>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm text-gray-900">{formatDate(req.createdAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{req.description}</p>
          </div>

          {req.rejectionReason && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-1">Rejection / Dispute Reason</p>
              <p className="text-sm text-rose-800">{req.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor / Job */}
      {job ? (
        <Card>
          <CardHeader>
            <CardTitle>Vendor &amp; Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Paused banner */}
            {job.isPaused && (
              <div className="flex items-start gap-3 rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Vendor paused — will return</p>
                  {job.pauseReason && <p className="text-sm text-amber-700 mt-0.5">{job.pauseReason}</p>}
                  {job.estimatedReturnDate && (
                    <p className="text-xs text-amber-600 mt-1">
                      Expected return: {new Date(job.estimatedReturnDate).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vendor info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company</p>
                <p className="text-sm text-gray-900 mt-1">{job.vendor.companyName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</p>
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-sm text-gray-900">{job.vendor.contactName}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                <a href={`tel:${job.vendor.phone}`} className="text-sm text-blue-600 hover:text-blue-700 mt-1 block">
                  {job.vendor.phone}
                </a>
              </div>
            </div>

            {job.vendor.email && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                <a href={`mailto:${job.vendor.email}`} className="text-sm text-blue-600 hover:text-blue-700 mt-1 block">{job.vendor.email}</a>
              </div>
            )}

            {/* Job status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Job Status</p>
                <p className="text-sm text-gray-900 mt-1">{job.status}</p>
              </div>
              {job.declineReason && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Decline Reason</p>
                  <p className="text-sm text-gray-700 mt-1">{job.declineReason}</p>
                </div>
              )}
            </div>

            {/* Completion summary */}
            {job.completionSummary && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Summary</p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{job.completionSummary}</p>
              </div>
            )}

            {job.vendorNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Notes</p>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{job.vendorNotes}</p>
              </div>
            )}

            {/* Cost summary */}
            {(job.totalLabourHours != null || job.totalMaterialsCost != null || job.totalCost != null) && (
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                {job.totalLabourHours != null && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Labour Hours</p>
                    <p className="text-sm text-gray-900 mt-1">{job.totalLabourHours}h</p>
                  </div>
                )}
                {job.totalMaterialsCost != null && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</p>
                    <p className="text-sm text-gray-900 mt-1">{formatCurrency(job.totalMaterialsCost)}</p>
                  </div>
                )}
                {job.totalCost != null && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(job.totalCost)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Photo count */}
            {job.photos?.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500 pt-1">
                <Image className="w-4 h-4" />
                {job.photos.length} vendor photo{job.photos.length !== 1 ? "s" : ""} attached
              </div>
            )}

            {/* Job notes */}
            {job.notes?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                {job.notes.map((note: any) => (
                  <div key={note.id} className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {note.author?.name ?? "System"}{" "}
                        <span className="text-gray-400 font-normal">({note.author?.role ?? "—"})</span>
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400 space-y-3">
            <p>No vendor assigned yet.</p>
            <AssignModal
              requestRef={req.referenceNumber}
              requestId={req.id}
              vendors={vendorsForModal}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
