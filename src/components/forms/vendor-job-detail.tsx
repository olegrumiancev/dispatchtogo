"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ImagePlus,
  Package,
  RotateCcw,
  PauseCircle,
} from "lucide-react";
import {
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  SERVICE_CATEGORIES,
} from "@/lib/constants";
import {
  submitJobCompletionAction,
  addJobNoteAction,
  uploadJobPhotosAction,
  addMaterialAction,
  deleteMaterialAction,
  requestPauseAction,
  cancelPauseAction,
} from "@/lib/actions";
import { formatDate } from "@/lib/utils";

type JobNote = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string; role: string };
};

type JobPhoto = {
  id: string;
  url: string;
  type: string;
  caption: string | null;
};

type JobMaterial = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  cost: number | null;
};

type ProofPacket = {
  id: string;
  pdfUrl: string;
  generatedAt: string;
};

type ServiceRequest = {
  id: string;
  referenceNumber: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  rejectionReason: string | null;
  property: {
    id: string;
    name: string;
    address: string | null;
  };
  photos: JobPhoto[];
};

type Job = {
  id: string;
  vendorId: string;
  acceptedAt: string | null;
  completedAt: string | null;
  isPaused: boolean;
  pauseReason: string | null;
  estimatedReturnDate: string | null;
  serviceRequest: ServiceRequest;
  notes: JobNote[];
  photos: JobPhoto[];
  materials: JobMaterial[];
  proofPacket: ProofPacket | null;
};

function getUrgencyColor(urgency: string) {
  return (
    URGENCY_LEVELS.find((u) => u.value === urgency)?.color ??
    "bg-gray-100 text-gray-800"
  );
}

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
  return (
    SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category
  );
}

interface VendorJobDetailProps {
  job: Job;
}

export function VendorJobDetail({ job: initialJob }: VendorJobDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [job, setJob] = useState<Job>(initialJob);
  const [noteText, setNoteText] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);

  // Material form
  const [matName, setMatName] = useState("");
  const [matQty, setMatQty] = useState("1");
  const [matUnit, setMatUnit] = useState("");
  const [matCost, setMatCost] = useState("");

  // Pause form
  const [showPauseForm, setShowPauseForm] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseReturnDate, setPauseReturnDate] = useState("");
  const [pauseError, setPauseError] = useState<string | null>(null);

  const [showNotes, setShowNotes] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const sr = job.serviceRequest;
  const isCompleted = !!job.completedAt;
  const hasRejection = !!sr.rejectionReason;

  // --- Note ---
  const handleAddNote = () => {
    if (!noteText.trim()) return;
    startTransition(async () => {
      setNoteError(null);
      try {
        const result = await addJobNoteAction(job.id, noteText);
        if (result?.error) {
          setNoteError(result.error);
          return;
        }
        if (result?.note) {
          setJob((prev) => ({
            ...prev,
            notes: [...prev.notes, result.note],
          }));
          setNoteText("");
        }
      } catch {
        setNoteError("Failed to add note.");
      }
    });
  };

  // --- Photos ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    startTransition(async () => {
      setPhotoError(null);
      const formData = new FormData();
      files.forEach((f) => formData.append("photos", f));
      formData.append("type", isCompleted ? "AFTER" : "DURING");

      try {
        const result = await uploadJobPhotosAction(job.id, formData);
        if (result?.error) {
          setPhotoError(result.error);
          return;
        }
        if (result?.photos) {
          setJob((prev) => ({
            ...prev,
            photos: [...prev.photos, ...result.photos],
          }));
        }
      } catch {
        setPhotoError("Failed to upload photos.");
      }
    });
    e.target.value = "";
  };

  // --- Materials ---
  const handleAddMaterial = () => {
    if (!matName.trim()) return;
    startTransition(async () => {
      setMaterialError(null);
      try {
        const result = await addMaterialAction(job.id, {
          name: matName,
          quantity: parseFloat(matQty) || 1,
          unit: matUnit || undefined,
          cost: matCost ? parseFloat(matCost) : undefined,
        });
        if (result?.error) {
          setMaterialError(result.error);
          return;
        }
        if (result?.material) {
          setJob((prev) => ({
            ...prev,
            materials: [...prev.materials, result.material],
          }));
          setMatName("");
          setMatQty("1");
          setMatUnit("");
          setMatCost("");
        }
      } catch {
        setMaterialError("Failed to add material.");
      }
    });
  };

  const handleDeleteMaterial = (materialId: string) => {
    startTransition(async () => {
      try {
        await deleteMaterialAction(materialId);
        setJob((prev) => ({
          ...prev,
          materials: prev.materials.filter((m) => m.id !== materialId),
        }));
      } catch {
        setMaterialError("Failed to delete material.");
      }
    });
  };

  // --- Pause / Resume ---
  const handleRequestPause = () => {
    if (!pauseReason.trim()) {
      setPauseError("Please provide a reason for the pause.");
      return;
    }
    startTransition(async () => {
      setPauseError(null);
      try {
        const result = await requestPauseAction(job.id, {
          reason: pauseReason,
          estimatedReturnDate: pauseReturnDate || undefined,
        });
        if (result?.error) {
          setPauseError(result.error);
          return;
        }
        setJob((prev) => ({
          ...prev,
          isPaused: true,
          pauseReason,
          estimatedReturnDate: pauseReturnDate || null,
        }));
        setShowPauseForm(false);
        setPauseReason("");
        setPauseReturnDate("");
      } catch {
        setPauseError("Failed to request pause.");
      }
    });
  };

  const handleCancelPause = () => {
    startTransition(async () => {
      setPauseError(null);
      try {
        const result = await cancelPauseAction(job.id);
        if (result?.error) {
          setPauseError(result.error);
          return;
        }
        setJob((prev) => ({
          ...prev,
          isPaused: false,
          pauseReason: null,
          estimatedReturnDate: null,
        }));
      } catch {
        setPauseError("Failed to cancel pause.");
      }
    });
  };

  // --- Completion ---
  const handleComplete = () => {
    startTransition(async () => {
      setError(null);
      try {
        const result = await submitJobCompletionAction(job.id, completionNote);
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Failed to submit completion.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {sr.referenceNumber}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={getStatusColor(sr.status)}>
              {getStatusLabel(sr.status)}
            </Badge>
            <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {getCategoryLabel(sr.category)}
            </span>
            {job.isPaused && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                Paused
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 self-start sm:self-auto"
        >
          ← Back to Jobs
        </button>
      </div>

      {/* Rejection banner */}
      {hasRejection && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <RotateCcw className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Work returned for rework
            </p>
            <p className="text-sm text-amber-700 mt-0.5">{sr.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Pause banner */}
      {job.isPaused && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <PauseCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">
              Job Paused — Will Return
            </p>
            {job.pauseReason && (
              <p className="text-sm text-orange-700 mt-0.5">{job.pauseReason}</p>
            )}
            {job.estimatedReturnDate && (
              <p className="text-xs text-orange-600 mt-1">
                Expected return: {formatDate(job.estimatedReturnDate)}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleCancelPause}
            loading={isPending}
            disabled={isPending}
            className="text-xs"
          >
            Resume
          </Button>
        </div>
      )}

      {/* Details */}
      <Card>
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{sr.property.name}</span>
            {sr.property.address && (
              <span className="text-gray-400 text-xs">· {sr.property.address}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            {job.acceptedAt
              ? `Accepted ${formatDate(job.acceptedAt)}`
              : "Not yet accepted"}
          </div>

          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {sr.description}
          </p>
        </CardContent>
      </Card>

      {/* Before photos (from service request) */}
      {sr.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Before Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sr.photos.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden border border-gray-100 hover:opacity-90 transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? ""}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowNotes((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes ({job.notes.length})
            </CardTitle>
            {showNotes ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </CardHeader>
        {showNotes && (
          <CardContent className="space-y-4">
            {noteError && (
              <p className="text-sm text-red-500">{noteError}</p>
            )}
            {job.notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {job.notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {note.author.name ?? note.author.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!isCompleted && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || isPending}
                  loading={isPending}
                  className="self-end"
                >
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Job photos */}
      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowPhotos((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <ImagePlus className="w-4 h-4" />
              Job Photos ({job.photos.length})
            </CardTitle>
            {showPhotos ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </CardHeader>
        {showPhotos && (
          <CardContent className="space-y-3">
            {photoError && (
              <p className="text-sm text-red-500">{photoError}</p>
            )}
            {job.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-gray-100 hover:opacity-90 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption ?? ""}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No photos uploaded yet.</p>
            )}

            {!isCompleted && (
              <>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 rounded-lg px-4 py-2.5 hover:bg-blue-50 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload photos
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowMaterials((v) => !v)}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              Materials ({job.materials.length})
            </CardTitle>
            {showMaterials ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </CardHeader>
        {showMaterials && (
          <CardContent className="space-y-3">
            {materialError && (
              <p className="text-sm text-red-500">{materialError}</p>
            )}
            {job.materials.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2">Item</th>
                    <th className="text-right pb-2">Qty</th>
                    <th className="text-right pb-2">Unit</th>
                    <th className="text-right pb-2">Cost</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {job.materials.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 text-gray-700">{m.name}</td>
                      <td className="py-2 text-right text-gray-600">{m.quantity}</td>
                      <td className="py-2 text-right text-gray-400">{m.unit ?? "-"}</td>
                      <td className="py-2 text-right text-gray-600">
                        {m.cost != null ? `$${m.cost.toFixed(2)}` : "-"}
                      </td>
                      <td className="py-2 text-right">
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(m.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No materials logged yet.</p>
            )}

            {!isCompleted && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <Input
                  placeholder="Item name"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={matQty}
                  onChange={(e) => setMatQty(e.target.value)}
                  min="0"
                />
                <Input
                  placeholder="Unit (optional)"
                  value={matUnit}
                  onChange={(e) => setMatUnit(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Cost (optional)"
                  value={matCost}
                  onChange={(e) => setMatCost(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <div className="col-span-2 sm:col-span-4">
                  <Button
                    variant="secondary"
                    onClick={handleAddMaterial}
                    disabled={!matName.trim() || isPending}
                    loading={isPending}
                  >
                    Add Material
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Proof packet */}
      {job.proofPacket && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Proof of Service Generated
                </span>
              </div>
              <a
                href={job.proofPacket.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Download PDF
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion / Pause actions */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-500">{error}</p>}

            {/* Pause controls */}
            {!job.isPaused && (
              <div>
                {!showPauseForm ? (
                  <button
                    type="button"
                    onClick={() => setShowPauseForm(true)}
                    className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <PauseCircle className="w-4 h-4" />
                    Request Pause
                  </button>
                ) : (
                  <div className="space-y-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-orange-800">
                      Request a Pause
                    </p>
                    {pauseError && (
                      <p className="text-sm text-red-500">{pauseError}</p>
                    )}
                    <Textarea
                      placeholder="Why do you need to pause? (required)"
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      rows={2}
                    />
                    <Input
                      type="date"
                      label="Expected return date (optional)"
                      value={pauseReturnDate}
                      onChange={(e) => setPauseReturnDate(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={handleRequestPause}
                        loading={isPending}
                        disabled={isPending || !pauseReason.trim()}
                      >
                        Submit Pause Request
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowPauseForm(false);
                          setPauseReason("");
                          setPauseReturnDate("");
                          setPauseError(null);
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                Mark job as complete
              </p>
              <Textarea
                placeholder="Completion notes (optional)"
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={3}
              />
              <Button
                variant="primary"
                onClick={handleComplete}
                loading={isPending}
                disabled={isPending}
              >
                Submit Completion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
