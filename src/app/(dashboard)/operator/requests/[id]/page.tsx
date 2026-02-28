import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REQUEST_STATUSES, URGENCY_LEVELS, SERVICE_CATEGORIES } from "@/lib/constants";
import { ArrowLeft, MapPin, Calendar, User, Wrench, CheckCircle, Phone, FileText, Package, Download } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { VerifyCompletionButton } from "@/components/forms/verify-completion-button";
import { TriageSection } from "@/components/forms/triage-section";
import type { AiTriageData } from "@/components/ui/ai-triage-badge";

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

// Timeline steps with labels and timestamp accessors
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

interface TimelineProps {
  currentStatus: string;
}

function StatusTimeline({ currentStatus }: TimelineProps) {
  const currentIdx = STATUS_PROGRESSION.indexOf(currentStatus as any);

  return (
    <div className="flex items-center gap-1 flex-nowrap min-w-max">
      {STATUS_PROGRESSION.map((status, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const label = getStatusLabel(status);

        return (
          <div key={status} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                isCurrent
                  ? "bg-blue-600 text-white"
                  : isDone
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone && <CheckCircle className="w-3 h-3" />}
              {label}
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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;
  const orgId: string = user.organizationId!;
  const { id } = await params;

  const req = await prisma.serviceRequest.findFirst({
    where: { id, organizationId: orgId },
    include: {
      property: {
        include: {
          contacts: true,
        },
      },
      photos: true,
      job: {
        include: {
          vendor: true,
          notes: {
            include: {
              author: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          photos: true,
          materials: true,
          proofPacket: true,
        },
      },
      invoice: true,
    },
  });

  if (!req) notFound();

  const primaryContact = req.property.contacts[0] ?? null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/operator/requests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{req.referenceNumber}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={getUrgencyColor(req.urgency)}>{req.urgency}</Badge>
            <Badge variant={getStatusColor(req.status)}>
              {getStatusLabel(req.status)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          {(req.status === "COMPLETED" || req.status === "VERIFIED") && req.job && (
            <a
              href={`/api/proof-packets/${req.job.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Proof Packet
            </a>
          )}
          {req.status === "COMPLETED" && (
            <VerifyCompletionButton requestId={req.id} />
          )}
        </div>
      </div>

      {/* Status timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-1">
            <StatusTimeline currentStatus={req.status} />
          </div>

          {/* Key timestamps */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-gray-500">
            <div>
              <p className="font-medium text-gray-700">Submitted</p>
              <p>{formatDate(req.createdAt)}</p>
            </div>
            {req.job?.acceptedAt && (
              <div>
                <p className="font-medium text-gray-700">Accepted</p>
                <p>{formatDate(req.job.acceptedAt)}</p>
              </div>
            )}
            {req.job?.enRouteAt && (
              <div>
                <p className="font-medium text-gray-700">En Route</p>
                <p>{formatDate(req.job.enRouteAt)}</p>
              </div>
            )}
            {req.job?.arrivedAt && (
              <div>
                <p className="font-medium text-gray-700">Arrived</p>
                <p>{formatDate(req.job.arrivedAt)}</p>
              </div>
            )}
            {req.job?.completedAt && (
              <div>
                <p className="font-medium text-gray-700">Completed</p>
                <p>{formatDate(req.job.completedAt)}</p>
              </div>
            )}
            {req.resolvedAt && (
              <div>
                <p className="font-medium text-gray-700">Resolved</p>
                <p>{formatDate(req.resolvedAt)}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm text-gray-900">{req.property.name}</p>
              </div>
              {req.property.address && (
                <p className="text-xs text-gray-500 mt-1 ml-5">{req.property.address}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Wrench className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-900">{getCategoryLabel(req.category)}</p>
              </div>
            </div>
            {primaryContact && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Contact
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">{primaryContact.name}</p>
                </div>
                {primaryContact.phone && (
                  <div className="flex items-center gap-1 mt-0.5 ml-5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <a href={`tel:${primaryContact.phone}`} className="text-xs text-blue-600 hover:text-blue-700">
                      {primaryContact.phone}
                    </a>
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-900">{formatDate(req.createdAt)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </p>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {req.description}
            </p>
          </div>


        </CardContent>
      </Card>

      {/* AI Triage */}
      {(() => {
        const clarifyingQuestions = Array.isArray(req.aiClarifyingQuestions)
          ? (req.aiClarifyingQuestions as string[])
          : [];
        const initialTriage: AiTriageData | null = req.aiSummary
          ? {
              category: req.category as AiTriageData["category"],
              urgency: req.urgency as AiTriageData["urgency"],
              requiresLicensedTrade: req.requiresLicensedTrade,
              summary: req.aiSummary,
              clarifyingQuestions,
              suggestedVendorCategories: [req.category as AiTriageData["category"]],
              confidence: 0.8,
            }
          : null;
        return (
          <TriageSection
            serviceRequestId={req.id}
            description={req.description}
            initialTriage={initialTriage}
          />
        );
      })()}

      {/* Vendor / Job info */}
      {req.job && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </p>
                <p className="text-sm text-gray-900 mt-1">{req.job.vendor.companyName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </p>
                <p className="text-sm text-gray-900 mt-1">{req.job.vendor.contactName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  <a href={`tel:${req.job.vendor.phone}`}>{req.job.vendor.phone}</a>
                </p>
              </div>
            </div>

            {req.job.vendorNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Notes
                </p>
                <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded-md">
                  {req.job.vendorNotes}
                </p>
              </div>
            )}

            {/* Job Notes */}
            {req.job.notes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Job Notes
                </p>
                <div className="space-y-2">
                  {req.job.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {note.author.name ?? note.author.email}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials */}
            {req.job.materials.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Materials Used
                </p>
                <div className="space-y-1">
                  {req.job.materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700">{m.description}</span>
                        <span className="text-gray-400">× {m.quantity}</span>
                      </div>
                      <span className="text-gray-600 font-medium">
                        {formatCurrency(m.unitCost * m.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 text-sm font-semibold text-gray-900">
                    <span>Total Materials</span>
                    <span>
                      {formatCurrency(
                        req.job.materials.reduce((s, m) => s + m.unitCost * m.quantity, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Completion summary + totals */}
            {req.job.completionSummary && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Summary
                </p>
                <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded-md">
                  {req.job.completionSummary}
                </p>
              </div>
            )}

            {req.job.proofPacket && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Proof Packet
                </p>
                <a
                  href={req.job.proofPacket.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  View PDF
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice */}
      {req.invoice && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</p>
                <p className="text-sm text-gray-900 mt-1">{req.invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(req.invoice.amount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <p className="text-sm text-gray-900 mt-1 capitalize">{req.invoice.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Intake photos on the request */}
          {req.photos.length === 0 && (!req.job || req.job.photos.length === 0) ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No photos attached yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {req.photos.map((photo) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={photo.thumbnailUrl ?? photo.url}
                      alt={`${photo.type} photo`}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{photo.type.toLowerCase()}</p>
                </a>
              ))}
              {req.job?.photos.map((photo) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={photo.thumbnailUrl ?? photo.url}
                      alt={`${photo.type} photo`}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{photo.type.toLowerCase()}</p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
