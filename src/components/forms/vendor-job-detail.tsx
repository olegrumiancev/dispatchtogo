"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  MapPin,
  Clock,
  AlertTriangle,
  Tag,
  Building2,
  User,
  FileText,
  Camera,
  CheckCircle,
  XCircle,
  Play,
  Upload,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

interface JobPhoto {
  id: string;
  url: string;
  uploadedAt: string | Date;
}

interface JobDetail {
  id: string;
  status: JobStatus;
  assignedAt: string | Date | null;
  acceptedAt: string | Date | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  notes: string | null;
  photos: JobPhoto[];
  request: {
    id: string;
    title: string | null;
    description: string;
    urgency: UrgencyLevel;
    category: string;
    property: {
      name: string;
      address: string | null;
    };
    operator: {
      name: string | null;
      email: string;
    };
  };
}

interface VendorJobDetailProps {
  job: JobDetail;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  EMERGENCY: "bg-red-100 text-red-800",
};

function formatDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VendorJobDetail({ job }: VendorJobDetailProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>(job.photos);

  // ─── Job action (accept / reject / start / complete) ───────────────────────

  async function handleAction(action: "accept" | "reject" | "start" | "complete") {
    setActionLoading(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to update job");
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Photo upload ──────────────────────────────────────────────────────────

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadLoading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const res = await fetch(`/api/jobs/${job.id}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Upload failed");
      }
      const { photos: newPhotos } = await res.json();
      setPhotos(newPhotos);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  }

  const { request } = job;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>
                {request.title || request.description.slice(0, 60)}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Job #{job.id.slice(0, 8)}
              </p>
            </div>
            <Badge variant={STATUS_COLORS[job.status]}>
              {STATUS_LABELS[job.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Property & operator */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="text-sm font-medium">{request.property.name}</p>
                {request.property.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {request.property.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Operator</p>
                <p className="text-sm font-medium">
                  {request.operator.name || request.operator.email}
                </p>
              </div>
            </div>
          </div>

          {/* Category & urgency */}
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1">
              <Tag className="w-3 h-3" />
              {request.category}
            </Badge>
            <Badge variant={URGENCY_COLORS[request.urgency]}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {request.urgency}
            </Badge>
          </div>

          {/* Description */}
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            {([
              ["Assigned", job.assignedAt],
              ["Accepted", job.acceptedAt],
              ["Started", job.startedAt],
              ["Completed", job.completedAt],
            ] as [string, string | Date | null][]).map(([label, date]) => (
              <div key={label}>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {label}
                </p>
                <p className="text-xs font-medium text-gray-800">
                  {formatDate(date)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions card */}
      {["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(job.status) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {actionError && (
              <p className="text-sm text-red-600 mb-3">{actionError}</p>
            )}
            <div className="flex flex-wrap gap-3">
              {job.status === "ASSIGNED" && (
                <>
                  <Button
                    onClick={() => handleAction("accept")}
                    loading={actionLoading === "accept"}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Job
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleAction("reject")}
                    loading={actionLoading === "reject"}
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </Button>
                </>
              )}
              {job.status === "ACCEPTED" && (
                <Button
                  onClick={() => handleAction("start")}
                  loading={actionLoading === "start"}
                >
                  <Play className="w-4 h-4" />
                  Start Work
                </Button>
              )}
              {job.status === "IN_PROGRESS" && (
                <Button
                  onClick={() => handleAction("complete")}
                  loading={actionLoading === "complete"}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Work Photos</CardTitle>
            {["IN_PROGRESS", "COMPLETED"].includes(job.status) && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadLoading}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
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
          )}
        </CardContent>
        {photos.length > 0 && (
          <CardFooter>
            <p className="text-xs text-gray-400">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
