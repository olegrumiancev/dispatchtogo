import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Tag,
  Building2,
  FileText,
  Camera,
  ShieldCheck,
  Download,
} from "lucide-react";
import { TriageSection } from "@/components/forms/triage-section";
import { VerifyCompletionButton } from "@/components/forms/verify-completion-button";
import { formatDate } from "@/lib/utils";

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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as any;
  if (user.role !== "OPERATOR") redirect("/");

  const { id } = await params;

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      property: true,
      organization: { select: { name: true } },
      photos: { orderBy: { uploadedAt: "asc" } },
      job: {
        include: {
          vendor: { select: { companyName: true, phone: true } },
          photos: { orderBy: { uploadedAt: "asc" } },
        },
      },
    },
  });

  if (!request || request.organizationId !== user.organizationId) {
    notFound();
  }

  // Build triage data for display
  const triageData = request.aiCategory
    ? {
        category: request.aiCategory as any,
        urgency: request.aiUrgency as any,
        requiresLicensedTrade: request.aiRequiresLicensedTrade ?? false,
        summary: request.aiSummary ?? "",
        clarifyingQuestions: (request.aiClarifyingQuestions as string[]) ?? [],
        suggestedVendorCategories:
          (request.aiSuggestedCategories as string[]) ?? [],
        confidence: request.aiConfidence ?? 0,
        aiOffline: request.aiOffline ?? false,
      }
    : null;

  const isCompleted = request.status === "COMPLETED";
  const canVerify =
    request.job?.status === "COMPLETED" && request.status !== "COMPLETED";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/operator/requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {request.referenceNumber}
            </h1>
            <Badge variant={getUrgencyColor(request.urgency)}>
              {request.urgency}
            </Badge>
            <Badge variant={getStatusColor(request.status)}>
              {getStatusLabel(request.status)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Created {formatDate(request.createdAt)}
          </p>
        </div>
      </div>

      {/* Request details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="text-sm font-medium">{request.property.name}</p>
                {request.property.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {request.property.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium">
                  {getCategoryLabel(request.category)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {formatDate(request.createdAt)}
                </p>
              </div>
            </div>

            {request.resolvedAt && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Resolved</p>
                  <p className="text-sm font-medium">
                    {formatDate(request.resolvedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Triage */}
      <Card>
        <CardHeader>
          <CardTitle>AI Triage</CardTitle>
        </CardHeader>
        <CardContent>
          <TriageSection requestId={request.id} initialTriage={triageData} />
        </CardContent>
      </Card>

      {/* Job / vendor info */}
      {request.job && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="text-sm font-medium">
                  {request.job.vendor.companyName}
                </p>
                <p className="text-xs text-gray-500">{request.job.vendor.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Job Status</p>
                <Badge className="mt-1">{request.job.status}</Badge>
              </div>
            </div>

            {canVerify && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2">
                  The vendor has marked this job complete. Please verify:
                </p>
                <VerifyCompletionButton requestId={request.id} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operator photos */}
      {request.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {request.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-md overflow-hidden border border-gray-100"
                >
                  <Image
                    src={photo.url}
                    alt="Request photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor work photos */}
      {request.job?.photos && request.job.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Work Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {request.job.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-md overflow-hidden border border-gray-100"
                >
                  <Image
                    src={photo.url}
                    alt="Work photo"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proof packet */}
      {isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Proof Packet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This request is complete. Download the full proof-of-service packet.
            </p>
            <a
              href={`/api/proof-packets/${request.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <Download className="w-4 h-4" />
                Download Proof Packet
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
