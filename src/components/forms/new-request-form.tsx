"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/lib/constants";
import {
  ImagePlus,
  ArrowLeft,
  Brain,
  AlertTriangle,
  Pencil,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  address: string | null;
}

interface AvailableVendor {
  id: string;
  companyName: string;
  contactName: string;
  serviceArea: string | null;
}

interface NewRequestFormProps {
  properties: Property[];
}

interface ClassificationResult {
  category: string;
  urgency: string;
  summary: string;
  confidence: number;
  reasoning: string;
  requiresLicensedTrade: boolean;
}

type Step = "describe" | "review";

export function NewRequestForm({ properties }: NewRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("describe");

  // Form state
  const [propertyId, setPropertyId] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  // AI classification
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  // Editable overrides (operator can change these)
  const [editCategory, setEditCategory] = useState("");
  const [editUrgency, setEditUrgency] = useState("");
  const [editing, setEditing] = useState(false);

  // Vendor picker
  const [availableVendors, setAvailableVendors] = useState<AvailableVendor[]>([]);
  const [preferredVendorId, setPreferredVendorId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // ─── Fetch available vendors when category changes on step 2 ────────────
  useEffect(() => {
    if (step !== "review" || !editCategory) {
      setAvailableVendors([]);
      setPreferredVendorId(null);
      setSelectedVendorId("");
      return;
    }

    let cancelled = false;
    setLoadingVendors(true);

    const params = new URLSearchParams({ category: editCategory });
    if (propertyId) params.set("propertyId", propertyId);

    fetch(`/api/vendors/available?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAvailableVendors(data.vendors ?? []);
        setPreferredVendorId(data.preferredVendorId ?? null);
        setSelectedVendorId("");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, editCategory, propertyId]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyError(null);

    try {
      const res = await fetch("/api/triage/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          propertyId: propertyId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setClassifyError(data.error ?? "Classification failed. You can still submit manually.");
        setClassification(null);
        setStep("review");
        setEditCategory("");
        setEditUrgency("MEDIUM");
        setEditing(true);
        return;
      }

      const result: ClassificationResult = await res.json();
      setClassification(result);
      setEditCategory(result.category);
      setEditUrgency(result.urgency);
      setEditing(false);
      setStep("review");
    } catch {
      setClassifyError("Network error during classification. You can still submit manually.");
      setClassification(null);
      setStep("review");
      setEditCategory("");
      setEditUrgency("MEDIUM");
      setEditing(true);
    } finally {
      setClassifying(false);
    }
  };

  const handleReclassify = () => {
    setStep("describe");
    setClassification(null);
    setClassifyError(null);
    setEditing(false);
    setSelectedVendorId("");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setUploadProgress(null);

    try {
      // Upload photos to S3 first (if any), collect URLs
      const photoUrls: string[] = [];
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1} of ${files.length}…`);
          const formData = new FormData();
          formData.append("file", files[i]);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) {
            const data = await uploadRes.json().catch(() => ({}));
            throw new Error(data.error ?? `Failed to upload photo ${i + 1}`);
          }
          const { url } = await uploadRes.json();
          photoUrls.push(url);
        }
        setUploadProgress(null);
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          description: description.trim(),
          category: editCategory || "GENERAL",
          urgency: editUrgency || "MEDIUM",
          photoUrls,
          preferredVendorId: selectedVendorId || undefined,
          aiClassification: classification
            ? {
                aiCategory: classification.category,
                aiUrgency: classification.urgency,
                summary: classification.summary,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
                requiresLicensedTrade: classification.requiresLicensedTrade,
                operatorOverrodeCategory:
                  editCategory.trim().toLowerCase() !==
                  classification.category.trim().toLowerCase(),
                operatorOverrodeUrgency:
                  editUrgency.trim().toLowerCase() !==
                  classification.urgency.trim().toLowerCase(),
              }
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Failed to submit request.");
        return;
      }

      const created = await res.json();
      router.push(`/operator/requests/${created.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.address ? `${p.name} — ${p.address}` : p.name,
  }));

  const getCategoryLabel = (value: string) =>
    SERVICE_CATEGORIES.find(
      (c) => c.value.trim().toLowerCase() === value.trim().toLowerCase()
    )?.label ?? value;

  const getUrgencyLabel = (value: string) =>
    URGENCY_LEVELS.find(
      (u) => u.value.trim().toLowerCase() === value.trim().toLowerCase()
    )?.label ?? value;

  const getUrgencyColor = (value: string) => {
    const match = URGENCY_LEVELS.find(
      (u) => u.value.trim().toLowerCase() === value.trim().toLowerCase()
    );
    return match?.color ?? "bg-gray-100 text-gray-800";
  };

  const confidenceLabel = (confidence: number) => {
    if (confidence >= 0.75) return { text: "High", color: "bg-emerald-100 text-emerald-800" };
    if (confidence >= 0.45) return { text: "Medium", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Low", color: "bg-red-100 text-red-800" };
  };

  const canClassify = propertyId && description.trim().length >= 10;

  const vendorOptions = availableVendors.map((v) => ({
    value: v.id,
    label: v.serviceArea
      ? `${v.companyName} (${v.serviceArea})`
      : v.companyName,
  }));

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/operator/requests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-3 text-sm">
        <div
          className={`flex items-center gap-1.5 ${
            step === "describe" ? "text-blue-700 font-medium" : "text-gray-400"
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === "describe"
                ? "bg-blue-600 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {step === "describe" ? "1" : <Check className="w-3.5 h-3.5" />}
          </span>
          Describe Issue
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <div
          className={`flex items-center gap-1.5 ${
            step === "review" ? "text-blue-700 font-medium" : "text-gray-400"
          }`}
        >
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step === "review"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            2
          </span>
          Review &amp; Submit
        </div>
      </div>

      {/* Errors */}
      {(classifyError || submitError) && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {classifyError || submitError}
        </div>
      )}

      {/* ─── Step 1: Describe ─────────────────────────────────────────────── */}
      {step === "describe" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Describe the Issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Property */}
              {properties.length === 0 ? (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                  No properties found for your organization. Please contact your administrator.
                </div>
              ) : (
                <Select
                  label="Property"
                  options={propertyOptions}
                  placeholder="Select a property..."
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                />
              )}

              {/* Description */}
              <Textarea
                label="Description"
                placeholder="Describe the issue in detail — what's wrong, where exactly, and any relevant details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </CardContent>
          </Card>

          {/* Photo upload */}
          <Card>
            <CardHeader>
              <CardTitle>Photos (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <ImagePlus className="w-10 h-10 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Drag &amp; drop photos here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or{" "}
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                        browse files
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            const selected = Array.from(e.target.files ?? []);
                            setFiles((prev) => [...prev, ...selected]);
                          }}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, HEIC up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {files.map((file, i) => (
                    <div key={i} className="relative group">
                      <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classify / Cancel buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Link href="/operator/requests" className="sm:flex-none">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto justify-center"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              variant="primary"
              loading={classifying}
              disabled={!canClassify || properties.length === 0}
              onClick={handleClassify}
              className="w-full sm:w-auto justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Classify with AI
            </Button>
          </div>
        </>
      )}

      {/* ─── Step 2: Review & Submit ──────────────────────────────────────── */}
      {step === "review" && (
        <>
          {/* Summary of what they entered */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Description</span>
                <button
                  type="button"
                  onClick={handleReclassify}
                  className="text-sm font-normal text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Edit &amp; Reclassify
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Property:</span>{" "}
                  {propertyOptions.find((p) => p.value === propertyId)?.label ??
                    "Unknown"}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {description}
                </p>
                {files.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {files.length} photo{files.length !== 1 ? "s" : ""} attached
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Classification Results */}
          {classification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Badges row */}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-purple-100 text-purple-800">
                    {getCategoryLabel(classification.category)}
                  </Badge>
                  <Badge className={getUrgencyColor(classification.urgency)}>
                    {getUrgencyLabel(classification.urgency)}
                  </Badge>
                  <Badge
                    className={
                      confidenceLabel(classification.confidence).color
                    }
                  >
                    {confidenceLabel(classification.confidence).text} confidence (
                    {Math.round(classification.confidence * 100)}%)
                  </Badge>
                  {classification.requiresLicensedTrade && (
                    <Badge className="bg-amber-100 text-amber-800 gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Licensed trade required
                    </Badge>
                  )}
                </div>

                {/* Summary & reasoning */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {classification.summary}
                  </p>
                  <p className="text-sm text-gray-500">
                    {classification.reasoning}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editable category / urgency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {editing ? "Set Category & Urgency" : "Final Category & Urgency"}
                </span>
                {classification && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm font-normal text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Override
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Category"
                    options={SERVICE_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    }))}
                    placeholder="Select category..."
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    required
                  />
                  <Select
                    label="Urgency"
                    options={URGENCY_LEVELS.map((u) => ({
                      value: u.value,
                      label: u.label,
                    }))}
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                    {getCategoryLabel(editCategory)}
                  </Badge>
                  <Badge
                    className={`text-sm px-3 py-1 ${getUrgencyColor(editUrgency)}`}
                  >
                    {getUrgencyLabel(editUrgency)}
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Accepting AI suggestion
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optional vendor picker */}
          <Card>
            <CardHeader>
              <CardTitle>Preferred Vendor (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                Leave blank to let the system automatically assign the best available vendor.
              </p>
              {loadingVendors ? (
                <p className="text-sm text-gray-400">Loading vendors…</p>
              ) : availableVendors.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No vendors available for this category yet.
                </p>
              ) : (
                <>
                  <Select
                    label="Vendor"
                    options={vendorOptions}
                    placeholder="Auto-assign (recommended)"
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                  />
                  {preferredVendorId && (
                    <p className="text-xs text-blue-600">
                      Your saved preference:{" "}
                      <button
                        type="button"
                        className="underline hover:text-blue-800"
                        onClick={() => setSelectedVendorId(preferredVendorId)}
                      >
                        {availableVendors.find((v) => v.id === preferredVendorId)
                          ?.companyName ?? "Preferred vendor"}
                      </button>
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit / Back buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReclassify}
              className="w-full sm:w-auto justify-center"
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              disabled={!editCategory}
              onClick={handleSubmit}
              className="w-full sm:w-auto justify-center"
            >
              {uploadProgress ?? (submitting ? "Submitting…" : "Submit Request")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
