"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { URGENCY_LEVELS, REQUEST_STATUSES, SERVICE_CATEGORIES } from "@/lib/constants";
import {
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  Camera,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Property {
  name: string;
  address: string | null;
}

interface PropertyContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
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

interface ServiceRequest {
  id: string;
  referenceNumber: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  property: Property & { contacts: PropertyContact[] };
  photos: Array<{ id: string; url: string; thumbnailUrl: string | null; type: string }>;
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
  notes: JobNote[];
  materials: JobMaterial[];
  photos: Array<{ id: string; url: string; thumbnailUrl: string | null; type: string }>;
  serviceRequest: ServiceRequest;
}

interface VendorJobDetailProps {
  job: Job;
}

type JobStatusAction = "accept" | "enroute" | "arrive" | "complete";

interface StatusActionConfig {
  label: string;
  action: JobStatusAction | null;
  description: string;
  icon: React.ElementType;
}

function getActionForStatus(status: string): StatusActionConfig | null {
  switch (status) {
    case "DISPATCHED":
      return { label: "Accept Job", action: "accept", description: "New job dispatched. Accept to begin.", icon: CheckCircle };
    case "ACCEPTED":
      return { label: "En Route", action: "enroute", description: "Job accepted. Tap when en route.", icon: Navigation };
    case "IN_PROGRESS":
      // Check if we have enRouteAt to show "Arrive" or we already arrived
      return { label: "Mark Complete", action: "complete", description: "You are on site. Tap when job is complete.", icon: CheckCircle };
    default:
      return null;
  }
}

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

export function VendorJobDetail({ job }: VendorJobDetailProps) {
  const router = useRouter();
  const sr = job.serviceRequest;
  const primaryContact = sr.property.contacts[0] ?? null;

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [newMaterials, setNewMaterials] = useState<NewMaterial[]>([]);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  const actionConfig = getActionForStatus(sr.status);

  // If en route but not yet arrived, show "Arrive"
  const showArriveAction = sr.status === "ACCEPTED" && job.enRouteAt;

  const handleStatusAction = async (action: JobStatusAction) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? "Action failed.");
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

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <Link
        href="/vendor/jobs"
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
          <Badge variant={getStatusColor(sr.status)}>
            {getStatusLabel(sr.status)}
          </Badge>
        </div>
      </div>

      {/* Status action button */}
      {sr.status !== "COMPLETED" && sr.status !== "VERIFIED" && sr.status !== "CANCELLED" && (
        <Card>
          <CardContent className="py-5">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Current Status</p>
                {actionError && <p className="text-xs text-red-600 mt-0.5">{actionError}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
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
                {/* If in progress, show complete */}
                {sr.status === "IN_PROGRESS" && (
                  <Button
                    variant="primary"
                    loading={actionLoading}
                    onClick={() => handleStatusAction("complete")}
                    className="w-full sm:w-auto justify-center min-h-[44px]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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

          {primaryContact && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  {primaryContact.name}
                  {primaryContact.role && (
                    <span className="text-gray-400 ml-1">({primaryContact.role})</span>
                  )}
                </p>
                {primaryContact.phone && (
                  <a
                    href={`tel:${primaryContact.phone}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {primaryContact.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</p>
            <p className="text-sm text-gray-700 mt-1">{sr.description}</p>
          </div>

          {/* Timeline */}
          {(job.acceptedAt || job.enRouteAt || job.arrivedAt || job.completedAt) && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-1 text-xs text-gray-600">
                {job.acceptedAt && <div><span className="font-medium">Accepted:</span> {formatDate(job.acceptedAt)}</div>}
                {job.enRouteAt && <div><span className="font-medium">En Route:</span> {formatDate(job.enRouteAt)}</div>}
                {job.arrivedAt && <div><span className="font-medium">Arrived:</span> {formatDate(job.arrivedAt)}</div>}
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
          <div className="flex items-center justify-between">
            <CardTitle>Before / After Photos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Existing job photos */}
          {job.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {job.photos.map((photo) => (
                <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                  <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={photo.thumbnailUrl ?? photo.url}
                      alt={photo.type}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{photo.type.toLowerCase()}</p>
                </a>
              ))}
            </div>
          )}

          {/* Upload new photos */}
          <div className="grid grid-cols-2 gap-4">
            {(["Before", "After"] as const).map((type) => (
              <div key={type}>
                <p className="text-xs font-medium text-gray-500 mb-2">{type}</p>
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Camera className="w-8 h-8 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Tap to capture</span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" />
                </label>
              </div>
            ))}
          </div>
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
    </div>
  );
}
