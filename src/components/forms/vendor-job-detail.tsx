"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import {
  MapPin,
  Navigation,
  CheckCircle,
  Camera,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  Loader2,
  RotateCcw,
  ChevronDown,
  Pause,
  Play,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Property {
  name: string;
  address: string | null;
}

interface JobMaterial {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
}

interface JobNote {
  id: string;
  text: string;
  createdAt: Date | string;
  author: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface JobPhoto {
  id: string;
  url: string;
  type: string;
  thumbnailUrl?: string | null;
}

interface ServiceRequest {
  id: string;
  referenceNumber: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  rejectionReason: string | null;
  property: Property;
  photos: JobPhoto[];
}

interface Job {
  id: string;
  acceptedAt: Date | string | null;
  enRouteAt: Date | string | null;
  arrivedAt: Date | string | null;
  completedAt: Date | string | null;
  vendorNotes: string | null;
  totalLabourHours: number | null;
  totalMaterialsCost: number | null;
  totalCost: number | null;
  isPaused: boolean;
  pauseReason: string | null;
  estimatedReturnDate: string | null;
  pausedAt: string | null;
  notes: JobNote[];
  materials: JobMaterial[];
  photos: JobPhoto[];
  serviceRequest: ServiceRequest;
}

interface VendorJobDetailProps {
  job: Job;
}

type JobStatusAction = "accept" | "enroute" | "arrive" | "complete";

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

interface NewMaterial {
  tempId: string;
  description: string;
  qty: number;
  unitCost: number;
}

type DeclineKey = "capacity" | "wont_service" | "other";

const DECLINE_OPTIONS: { key: DeclineKey; label: string; value: string | null }[] = [
  { key: "capacity",     label: "Over capacity",         value: "Over capacity — currently unavailable to take on new jobs" },
  { key: "wont_service", label: "Won't service",          value: "Unable to service this request" },
  { key: "other",        label: "Other (provide reason)", value: null },
];

export function VendorJobDetail({ job }: VendorJobDetailProps) {
  const router = useRouter();
  const sr = job.serviceRequest;

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Decline flow
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineKey, setDeclineKey] = useState<DeclineKey | null>(null);
  const [otherDeclineReason, setOtherDeclineReason] = useState("");

  // Pause modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseError, setPauseError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [newMaterials, setNewMaterials] = useState<NewMaterial[]>([]);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>(job.photos);
  const [pendingPhotos, setPendingPhotos] = useState<Record<"BEFORE" | "AFTER", File[]>>({
    BEFORE: [],
    AFTER: [],
  });

  const canModifyPhotos = !["COMPLETED", "VERIFIED", "CANCELLED"].includes(sr.status);

  const beforePhotos = photos.filter((p) => p.type === "BEFORE");
  const afterPhotos  = photos.filter((p) => p.type === "AFTER");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, photoType: "BEFORE" | "AFTER") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);
    setPendingPhotos((prev) => ({
      ...prev,
      [photoType]: [...prev[photoType], ...selectedFiles],
    }));
    e.target.value = "";
  };

  const handleUploadPendingPhotos = async (photoType: "BEFORE" | "AFTER") => {
    const filesToUpload = pendingPhotos[photoType];
    if (filesToUpload.length === 0) return;

    setPhotoError(null);
    setPhotoUploading((prev) => ({ ...prev, [photoType]: true }));
    let uploadedAny = false;
    let firstError: string | null = null;
    const failedFiles: File[] = [];
    try {
      for (const file of filesToUpload) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            const d = await uploadRes.json().catch(() => ({}));
            throw new Error(d.error ?? "Upload failed");
          }
          const { url } = await uploadRes.json();
          const saveRes = await fetch(`/api/jobs/${job.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "photo", url, photoType }),
          });
          if (!saveRes.ok) {
            const d = await saveRes.json().catch(() => ({}));
            throw new Error(d.error ?? "Failed to save photo");
          }
          const createdPhoto = await saveRes.json();
          uploadedAny = true;
          setPhotos((prev) => [
            ...prev,
            {
              id: createdPhoto.id,
              url: createdPhoto.url,
              type: createdPhoto.type,
              thumbnailUrl: createdPhoto.thumbnailUrl ?? null,
            },
          ]);
        } catch (fileErr: any) {
          failedFiles.push(file);
          if (!firstError) firstError = fileErr.message ?? "Photo upload failed";
        }
      }
    } finally {
      if (uploadedAny) router.refresh();
      setPendingPhotos((prev) => ({
        ...prev,
        [photoType]: failedFiles,
      }));
      if (firstError) setPhotoError(firstError);
      setPhotoUploading((prev) => ({ ...prev, [photoType]: false }));
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    setPhotoError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete photo");
      }
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      router.refresh();
    } catch (err: any) {
      setPhotoError(err.message ?? "Delete failed");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleStatusAction = async (
    action: JobStatusAction | "decline",
    declineReason?: string
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const body: Record<string, string> = { action };
      if (declineReason) body.declineReason = declineReason;
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Action failed.");
        return;
      }
      if (action === "decline") {
        router.push("/app/vendor/jobs");
      } else {
        router.refresh();
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
      setShowDeclineModal(false);
    }
  };

  const handleDeclineConfirm = () => {
    if (!declineKey) return;
    const reason =
      declineKey === "other"
        ? otherDeclineReason.trim()
        : (DECLINE_OPTIONS.find((o) => o.key === declineKey)?.value ?? "");
    if (!reason) return;
    handleStatusAction("decline", reason);
  };

  const resetDeclineModal = () => {
    setShowDeclineModal(false);
    setDeclineKey(null);
    setOtherDeclineReason("");
  };

  const handlePause = async () => {
    setPauseLoading(true);
    setPauseError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pause",
          pauseReason: pauseReason.trim() || null,
          estimatedReturnDate: estimatedReturnDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPauseError(data.error ?? "Failed to pause job.");
        return;
      }
      setShowPauseModal(false);
      setPauseReason("");
      setEstimatedReturnDate("");
      router.refresh();
    } catch {
      setPauseError("Network error. Please try again.");
    } finally {
      setPauseLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Failed to resume.");
        return;
      }
      router.refresh();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "note", text: noteText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNoteError(data.error ?? "Failed to save note.");
        return;
      }
      setNoteText("");
      router.refresh();
    } catch {
      setNoteError("Network error. Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const addNewMaterial = () => {
    setNewMaterials((prev) => [
      ...prev,
      { tempId: Date.now().toString(), description: "", qty: 1, unitCost: 0 },
    ]);
  };

  const updateNewMaterial = (tempId: string, field: keyof NewMaterial, value: string | number) => {
    setNewMaterials((prev) =>
      prev.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m))
    );
  };

  const removeNewMaterial = (tempId: string) => {
    setNewMaterials((prev) => prev.filter((m) => m.tempId !== tempId));
  };

  const handleSaveMaterials = async () => {
    const toSave = newMaterials.filter((m) => m.description.trim());
    if (toSave.length === 0) return;
    setSavingMaterials(true);
    setMaterialError(null);
    try {
      await Promise.all(
        toSave.map((m) =>
          fetch(`/api/jobs/${job.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "material",
              description: m.description,
              quantity: m.qty,
              unitCost: m.unitCost,
            }),
          })
        )
      );
      setNewMaterials([]);
      router.refresh();
    } catch {
      setMaterialError("Network error. Please try again.");
    } finally {
      setSavingMaterials(false);
    }
  };

  const existingMaterialsTotal = job.materials.reduce(
    (sum, m) => sum + m.unitCost * m.quantity,
    0
  );
  const newMaterialsTotal = newMaterials.reduce((sum, m) => sum + m.qty * m.unitCost, 0);

  // Tomorrow's date for the min on the return date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <Link
        href="/app/vendor/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Job header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{sr.referenceNumber}</h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
          <Badge variant="bg-gray-100 text-gray-700">{getCategoryLabel(sr.category)}</Badge>
          {job.isPaused ? (
            <Badge variant="bg-amber-100 text-amber-800">Paused — Will Return</Badge>
          ) : (
            <Badge variant={getStatusColor(sr.status)}>
              {getStatusLabel(sr.status)}
            </Badge>
          )}
        </div>
      </div>

      {/* Paused banner */}
      {job.isPaused && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <Pause className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Job paused — you need to return</p>
            {job.pauseReason && (
              <p className="text-sm text-amber-700 mt-0.5">{job.pauseReason}</p>
            )}
            {job.estimatedReturnDate && (
              <p className="text-xs text-amber-600 mt-1">
                Expected return: {new Date(job.estimatedReturnDate).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
              </p>
            )}
            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                onClick={handleResume}
              >
                <Play className="w-4 h-4" />
                Resume Work
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection reason banner (work sent back for rework) */}
      {sr.rejectionReason && sr.status === "IN_PROGRESS" && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
          <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Work sent back for rework</p>
            <p className="text-sm text-amber-700 mt-0.5">{sr.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Status action button */}
      {sr.status !== "COMPLETED" && sr.status !== "VERIFIED" && sr.status !== "CANCELLED" && !job.isPaused && (
        <Card>
          <CardContent className="py-5">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Current Status</p>
                {actionError && <p className="text-xs text-red-600 mt-0.5">{actionError}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Decline — only available when job is freshly dispatched */}
                {sr.status === "DISPATCHED" && (
                  <Button
                    variant="danger"
                    loading={actionLoading}
                    onClick={() => setShowDeclineModal(true)}
                    className="w-full sm:w-auto justify-center min-h-[44px] gap-2"
                  >
                    <X className="w-4 h-4" />
                    Decline Job
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                )}
                {/* If accepted and not yet en route */}
                {sr.status === "ACCEPTED" && !job.enRouteAt && (
                  <Button
                    variant="primary"
                    loading={actionLoading}
                    onClick={() => handleStatusAction("enroute")}
                    className="w-full sm:w-auto justify-center min-h-[44px]"
                  >
                    <Navigation className="w-4 h-4" />
                    En Route
                  </Button>
                )}
                {/* If en route but not arrived */}
                {sr.status === "ACCEPTED" && job.enRouteAt && !job.arrivedAt && (
                  <Button
                    variant="primary"
                    loading={actionLoading}
                    onClick={() => handleStatusAction("arrive")}
                    className="w-full sm:w-auto justify-center min-h-[44px]"
                  >
                    <MapPin className="w-4 h-4" />
                    Arrived on Site
                  </Button>
                )}
                {/* If dispatched, show accept */}
                {sr.status === "DISPATCHED" && (
                  <Button
                    variant="primary"
                    loading={actionLoading}
                    onClick={() => handleStatusAction("accept")}
                    className="w-full sm:w-auto justify-center min-h-[44px]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Job
                  </Button>
                )}
                {/* If in progress, show complete + pause */}
                {sr.status === "IN_PROGRESS" && (
                  <>
                    <Button
                      variant="primary"
                      loading={actionLoading}
                      onClick={() => handleStatusAction("complete")}
                      className="w-full sm:w-auto justify-center min-h-[44px]"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPauseReason("");
                        setEstimatedReturnDate("");
                        setPauseError(null);
                        setShowPauseModal(true);
                      }}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] border border-amber-300 text-amber-700 text-sm font-medium rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      <Pause className="w-4 h-4" />
                      Pause — Will Return
                    </button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pause modal */}
      {showPauseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPauseModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pause Job</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Need to order parts, wait for delivery, or come back another day? Pause the job and resume when ready.
                </p>
              </div>
              <button
                onClick={() => setShowPauseModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 -mt-1 -mr-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Why are you pausing? <span className="text-gray-400 text-xs font-normal">(recommended)</span>
              </label>
              <Textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., Need to order a replacement valve — parts arriving tomorrow"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                When do you expect to return?
              </label>
              <input
                type="date"
                value={estimatedReturnDate}
                min={tomorrowStr}
                onChange={(e) => setEstimatedReturnDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {pauseError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {pauseError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePause}
                disabled={pauseLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {pauseLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pausing…</>
                ) : (
                  <><Pause className="w-3.5 h-3.5" /> Pause Job</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job info */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{sr.property.name}</p>
              {sr.property.address && (
                <p className="text-xs text-gray-500">{sr.property.address}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 mt-1">{sr.description}</p>
          </div>

          {/* Timeline */}
          {(job.acceptedAt || job.enRouteAt || job.arrivedAt || job.completedAt || job.pausedAt) && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-1 text-xs text-gray-600">
                {job.acceptedAt && <div><span className="font-medium">Accepted:</span> {formatDate(job.acceptedAt)}</div>}
                {job.enRouteAt && <div><span className="font-medium">En Route:</span> {formatDate(job.enRouteAt)}</div>}
                {job.arrivedAt && <div><span className="font-medium">Arrived:</span> {formatDate(job.arrivedAt)}</div>}
                {job.pausedAt && job.isPaused && <div><span className="font-medium text-amber-700">Paused:</span> {formatDate(job.pausedAt)}</div>}
                {job.completedAt && <div><span className="font-medium">Completed:</span> {formatDate(job.completedAt)}</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing notes */}
      {job.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.notes.map((note) => (
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
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle>Before / After Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {photoError && (
            <p className="text-xs text-red-600">{photoError}</p>
          )}
          {(["BEFORE", "AFTER"] as const).map((type) => {
            const photos = type === "BEFORE" ? beforePhotos : afterPhotos;
            const uploading = !!photoUploading[type];
            const queuedCount = pendingPhotos[type].length;
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {type === "BEFORE" ? "Before" : "After"}
                  </p>
                  {canModifyPhotos && (
                    <div className="flex items-center gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer px-2.5 py-1.5 rounded-md border transition-colors ${
                          uploading
                            ? "opacity-50 cursor-not-allowed border-gray-200 text-gray-400"
                            : "border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        <><Camera className="w-3.5 h-3.5" /> Select Photos</>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploading}
                          className="sr-only"
                          onClick={(e) => {
                            e.currentTarget.value = "";
                          }}
                          onChange={(e) => handlePhotoUpload(e, type)}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={uploading}
                        disabled={uploading || queuedCount === 0}
                        onClick={() => handleUploadPendingPhotos(type)}
                      >
                        Upload {queuedCount > 0 ? `(${queuedCount})` : ""}
                      </Button>
                    </div>
                  )}
                </div>
                {canModifyPhotos && queuedCount > 0 && (
                  <p className="text-xs text-gray-500 mb-2">{queuedCount} photo(s) queued for upload</p>
                )}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <a href={photo.url} target="_blank" rel="noopener noreferrer">
                          <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                            <img
                              src={photo.url}
                              alt={`${type} photo`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                          </div>
                        </a>
                        {canModifyPhotos && (
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(photo.id)}
                            disabled={deletingPhotoId === photo.id}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                            title="Delete photo"
                          >
                            {deletingPhotoId === photo.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400">
                      {canModifyPhotos ? "No photos yet — tap Add Photo" : "No photos"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Materials Used</CardTitle>
            <Button variant="secondary" size="sm" onClick={addNewMaterial}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Saved materials */}
          {job.materials.length > 0 && (
            <div className="space-y-1 mb-4">
              {job.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700">{m.description}</span>
                    <span className="text-gray-400">× {m.quantity}</span>
                  </div>
                  <span className="text-gray-600 font-medium">
                    {formatCurrency(m.unitCost * m.quantity)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-1 border-t border-gray-100 text-sm text-gray-600">
                <span>Subtotal (saved)</span>
                <span>{formatCurrency(existingMaterialsTotal)}</span>
              </div>
            </div>
          )}

          {/* New unsaved materials */}
          {newMaterials.length === 0 && job.materials.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No materials added yet.
            </p>
          ) : null}

          {newMaterials.length > 0 && (
            <div className="space-y-3">
              {materialError && (
                <p className="text-xs text-red-600">{materialError}</p>
              )}
              {newMaterials.map((m) => (
                <div key={m.tempId} className="flex flex-col sm:flex-row gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Description"
                    value={m.description}
                    onChange={(e) => updateNewMaterial(m.tempId, "description", e.target.value)}
                    className="w-full sm:flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={m.qty}
                      min={1}
                      onChange={(e) => updateNewMaterial(m.tempId, "qty", Number(e.target.value))}
                      className="w-20 sm:w-16 rounded-md border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Cost"
                      value={m.unitCost}
                      min={0}
                      step={0.01}
                      onChange={(e) => updateNewMaterial(m.tempId, "unitCost", Number(e.target.value))}
                      className="flex-1 sm:w-24 rounded-md border border-gray-300 px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeNewMaterial(m.tempId)}
                      className="p-2 min-h-[44px] min-w-[44px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  New items total: {formatCurrency(newMaterialsTotal)}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  loading={savingMaterials}
                  onClick={handleSaveMaterials}
                >
                  Save Materials
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {noteError && <p className="text-xs text-red-600">{noteError}</p>}
          <Textarea
            placeholder="Add notes about the work performed, findings, or follow-up required..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              loading={savingNote}
              disabled={!noteText.trim()}
              onClick={handleSaveNote}
            >
              Save Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Decline reason modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showDeclineModal}
        onClose={resetDeclineModal}
        title="Decline Job"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This job will be returned to the dispatch queue and assigned to another vendor.
            Please select a reason:
          </p>

          <div className="flex flex-col gap-2">
            {DECLINE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setDeclineKey(opt.key); setOtherDeclineReason(""); }}
                className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                  declineKey === opt.key
                    ? "border-red-400 bg-red-50 text-red-900 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>

          {declineKey === "other" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">
                Describe the reason
              </label>
              <textarea
                rows={3}
                placeholder="Provide details about why you're declining this job…"
                value={otherDeclineReason}
                onChange={(e) => setOtherDeclineReason(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          )}

          {actionError && (
            <p className="text-xs text-red-600">{actionError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="danger"
              loading={actionLoading}
              disabled={
                !declineKey ||
                (declineKey === "other" && !otherDeclineReason.trim())
              }
              onClick={handleDeclineConfirm}
              className="flex-1 justify-center"
            >
              Confirm Decline
            </Button>
            <Button
              variant="secondary"
              disabled={actionLoading}
              onClick={resetDeclineModal}
              className="flex-1 justify-center"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
