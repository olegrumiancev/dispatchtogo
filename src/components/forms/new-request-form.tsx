"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { optimizeImageFileForUpload } from "@/lib/client-image";
import { URGENCY_LEVELS } from "@/lib/constants";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import {
  ImagePlus,
  ArrowLeft,
  Brain,
  AlertTriangle,
  Pencil,
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const AI_MAX_RETRIES = Math.max(1, parseInt(process.env.AI_TRIAGE_MAX_RETRIES ?? "3", 10));

interface Property {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
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
  statusSuggestion: "READY_TO_DISPATCH" | "NEEDS_CLARIFICATION";
  clarifyingQuestions: string[];
}

type Step = "describe" | "review";

function buildClarificationPayload(
  questions: string[],
  answers: Record<string, string>
) {
  return questions
    .map((question, index) => {
      const answer = answers[question]?.trim() ?? "";
      return `${index + 1}. ${question}\nAnswer: ${answer}`;
    })
    .join("\n\n");
}

function buildDescriptionWithClarifications(
  baseDescription: string,
  clarificationTranscript: string
) {
  return [baseDescription.trim(), clarificationTranscript.trim()]
    .filter(Boolean)
    .join("\n\n");
}

export function NewRequestForm({ properties }: NewRequestFormProps) {
  const router = useRouter();
  const { serviceCategories } = useCatalogOptions();
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
  const [classifyStatus, setClassifyStatus] = useState<string | null>(null);

  // Editable overrides (operator can change these)
  const [editCategory, setEditCategory] = useState("");
  const [editUrgency, setEditUrgency] = useState("");
  const [editing, setEditing] = useState(false);

  // Vendor picker
  const [availableVendors, setAvailableVendors] = useState<AvailableVendor[]>([]);
  const [preferredVendorId, setPreferredVendorId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Billing usage
  const [usage, setUsage] = useState<{
    completedRequests: number;
    includedRequests: number;
    ratePerRequest: number;
    isOverLimit: boolean;
    amountCad: number;
  } | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [clarificationTranscript, setClarificationTranscript] = useState("");
  const [answeredClarificationQuestions, setAnsweredClarificationQuestions] = useState<string[]>([]);
  const [clarificationRoundCompleted, setClarificationRoundCompleted] = useState(false);

  // ─── Fetch billing usage on mount ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/requests/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setUsage(data); })
      .catch(() => {});
  }, []);

  // ─── Fetch available vendors when category changes on step 2 ────────────────────
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

  useEffect(() => {
    if (
      clarificationRoundCompleted ||
      !classification ||
      classification.statusSuggestion !== "NEEDS_CLARIFICATION" ||
      classification.clarifyingQuestions.length === 0
    ) {
      setClarificationAnswers({});
      return;
    }

    setClarificationAnswers((currentAnswers) =>
      Object.fromEntries(
        classification.clarifyingQuestions
          .filter((question) => !answeredClarificationQuestions.includes(question))
          .map((question) => [
          question,
          currentAnswers[question] ?? "",
        ])
      )
    );
  }, [answeredClarificationQuestions, clarificationRoundCompleted, classification]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const requestClassification = async (
    inputDescription: string,
    initialStatus: string
  ): Promise<ClassificationResult> => {
    setClassifyStatus(null);

    let lastError = "Classification failed. You can still submit manually.";

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      if (attempt === 1) {
        setClassifyStatus(initialStatus);
      } else {
        setClassifyStatus(
          `AI returned unexpected data - retrying... (attempt ${attempt} of ${AI_MAX_RETRIES})`
        );
        await sleep(1000);
      }

      try {
        const res = await fetch("/api/triage/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: inputDescription,
            propertyId: propertyId || undefined,
          }),
        });

        // Don't retry client errors - they won't be fixed by retrying
        if (res.status >= 400 && res.status < 500) {
          const data = await res.json().catch(() => ({}));
          lastError = data.error ?? "Classification failed. You can still submit manually.";
          break;
        }

        if (!res.ok) {
          // 5xx or network-level bad response - retry
          const data = await res.json().catch(() => ({}));
          lastError = data.error ?? "Classification failed. You can still submit manually.";
          continue;
        }

        const result: ClassificationResult = await res.json();
        setClassifyStatus(null);
        return result;
      } catch {
        lastError = "Network error during classification. You can still submit manually.";
        // Network error - retry unless this was the last attempt
      }
    }

    setClassifyStatus(null);
    throw new Error(lastError);
  };

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyError(null);
    setClassifyStatus(null);
    setSubmitError(null);
    setClarificationTranscript("");
    setClarificationAnswers({});
    setAnsweredClarificationQuestions([]);
    setClarificationRoundCompleted(false);

    try {
      const result = await requestClassification(
        description.trim(),
        "Classifying your request..."
      );
      setClassification(result);
      setEditCategory(result.category);
      setEditUrgency(result.urgency);
      setEditing(false);
      setStep("review");
    } catch (err) {
      const lastError =
        err instanceof Error
          ? err.message
          : "Classification failed. You can still submit manually.";
      setClassifyError(lastError);
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
    setSubmitError(null);
    setEditing(false);
    setSelectedVendorId("");
    setClarificationAnswers({});
    setClarificationTranscript("");
    setAnsweredClarificationQuestions([]);
    setClarificationRoundCompleted(false);
  };

  const handleClarificationReview = async () => {
    if (
      !classification ||
      classification.statusSuggestion !== "NEEDS_CLARIFICATION" ||
      pendingClarifyingQuestions.length === 0
    ) {
      return;
    }

    const unansweredQuestions = pendingClarifyingQuestions.filter(
      (question) => !clarificationAnswers[question]?.trim()
    );
    if (unansweredQuestions.length > 0) {
      setSubmitError(
        'Answer each clarification question before continuing. If something is not confirmed yet, enter "unknown".'
      );
      return;
    }

    setClassifying(true);
    setClassifyError(null);
    setSubmitError(null);

    const nextTranscript = [
      clarificationTranscript,
      "Clarification provided before submission:",
      buildClarificationPayload(pendingClarifyingQuestions, clarificationAnswers),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const refinedClassification = await requestClassification(
        buildDescriptionWithClarifications(description, nextTranscript),
        "Re-checking your request with the clarification answers..."
      );

      setClassification(refinedClassification);
      setClarificationTranscript(nextTranscript);
      setAnsweredClarificationQuestions((currentQuestions) =>
        Array.from(new Set([...currentQuestions, ...pendingClarifyingQuestions]))
      );
      setClarificationRoundCompleted(true);

      if (!editing) {
        setEditCategory(refinedClassification.category);
        setEditUrgency(refinedClassification.urgency);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Unable to update the AI review with the clarification answers."
      );
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async () => {
    if (needsPreSubmitClarification) {
      setSubmitError(
        "Answer the clarification questions and update the AI review before submitting."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setUploadProgress(null);

    try {
      const finalDescription = buildDescriptionWithClarifications(
        description,
        clarificationTranscript
      );

      // Upload photos to S3 first (if any), collect URLs
      const photoUploads: Array<{
        url: string;
        fullUrl?: string | null;
        thumbnailUrl?: string | null;
      }> = [];
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(`Uploading photo ${i + 1} of ${files.length}…`);
          const optimizedFile = await optimizeImageFileForUpload(files[i]);
          const formData = new FormData();
          formData.append("file", optimizedFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) {
            const data = await uploadRes.json().catch(() => ({}));
            throw new Error(data.error ?? `Failed to upload photo ${i + 1}`);
          }
          const uploaded = await uploadRes.json();
          photoUploads.push({
            url: uploaded.url,
            fullUrl: uploaded.fullUrl ?? null,
            thumbnailUrl: uploaded.thumbnailUrl ?? null,
          });
        }
        setUploadProgress(null);
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          description: finalDescription,
          category: editCategory || "GENERAL",
          urgency: editUrgency || "MEDIUM",
          photoUploads,
          preferredVendorId: selectedVendorId || undefined,
          aiClassification: classification
            ? {
                aiCategory: classification.category,
                aiUrgency: classification.urgency,
                summary: classification.summary,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
                requiresLicensedTrade: classification.requiresLicensedTrade,
                clarifyingQuestions: pendingClarifyingQuestions,
                statusSuggestion: effectiveStatusSuggestion,
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
      // Invalidate the router cache so the requests list and dashboard re-fetch
      // fresh data (Server Components would otherwise serve a stale cached render).
      router.refresh();
      if (created.paymentRequired) {
        router.push(`/app/operator/billing?held=1`);
      } else {
        router.push(`/app/operator/requests/${created.id}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.address ? `${p.name} — ${p.address}` : p.name,
  }));
  const selectedProperty = properties.find((property) => property.id === propertyId) ?? null;

  const getCategoryLabel = (value: string) =>
    serviceCategories.find(
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
  const unresolvedClarifyingQuestions =
    classification?.clarifyingQuestions.filter(
      (question) => !answeredClarificationQuestions.includes(question)
    ) ?? [];
  const pendingClarifyingQuestions = clarificationRoundCompleted
    ? []
    : unresolvedClarifyingQuestions;
  const needsPreSubmitClarification =
    classification?.statusSuggestion === "NEEDS_CLARIFICATION" &&
    pendingClarifyingQuestions.length > 0;
  const effectiveStatusSuggestion =
    classification && !needsPreSubmitClarification
      ? "READY_TO_DISPATCH"
      : classification?.statusSuggestion ?? "READY_TO_DISPATCH";

  const vendorOptions = availableVendors.map((v) => ({
    value: v.id,
    label: v.serviceArea
      ? `${v.companyName} (${v.serviceArea})`
      : v.companyName,
  }));

  // ─── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/app/operator/requests"
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

      {/* Billing overage banner — shown when org is in pay-as-you-go territory */}
      {usage?.isOverLimit && (
        <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">
              Pay-as-you-go — {usage.completedRequests} of {usage.includedRequests} included requests used this month
            </p>
            <p className="text-amber-700 mt-0.5">
              This request will be billed at <strong>${usage.ratePerRequest.toFixed(2)} CAD</strong> upon completion.
              Charges are invoiced at the end of the month.
            </p>
          </div>
        </div>
      )}

      {/* AI retry status — shown while classify attempts are in-flight */}
      {classifyStatus && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {classifyStatus}
        </div>
      )}

      {/* Errors */}
      {(classifyError || submitError) && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {classifyError || submitError}
        </div>
      )}

      {/* ─── Step 1: Describe ────────────────────────────────────────────────── */}
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

              {selectedProperty && (
                <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contact Shared With Vendor
                  </p>
                  {selectedProperty.contactName || selectedProperty.contactPhone || selectedProperty.contactEmail ? (
                    <div className="mt-2 space-y-1 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">
                        {selectedProperty.contactName || "Site contact"}
                      </p>
                      {selectedProperty.contactPhone && (
                        <p>{selectedProperty.contactPhone}</p>
                      )}
                      {selectedProperty.contactEmail && (
                        <p>{selectedProperty.contactEmail}</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-600">
                      No property-specific contact is set. Vendors will use your organization dispatch contact instead.
                    </p>
                  )}
                </div>
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
            <Link href="/app/operator/requests" className="sm:flex-none">
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

      {/* ─── Step 2: Review & Submit ──────────────────────────────────────────────── */}
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
                {clarificationTranscript && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-700">
                      Clarification Added
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                      {clarificationTranscript}
                    </p>
                  </div>
                )}
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

                {classification.statusSuggestion === "NEEDS_CLARIFICATION" && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-900">
                      {needsPreSubmitClarification
                        ? "This request is not ready to submit yet."
                        : "Clarification has already been added to this request."}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {needsPreSubmitClarification
                        ? "Answer the clarification questions below, then update the AI review before continuing."
                        : "The answered clarification is already included in the description above, so those same questions are no longer shown here."}
                    </p>
                    {needsPreSubmitClarification && (
                      <div className="mt-3 space-y-3">
                        {pendingClarifyingQuestions.map((question, index) => (
                          <div
                            key={`${index}-${question}`}
                            className="rounded-md border border-amber-200 bg-white px-4 py-3"
                          >
                            <p className="text-sm font-medium text-slate-900">
                              {index + 1}. {question}
                            </p>
                            <Textarea
                              label="Answer"
                              value={clarificationAnswers[question] ?? ""}
                              onChange={(e) =>
                                setClarificationAnswers((currentAnswers) => ({
                                  ...currentAnswers,
                                  [question]: e.target.value,
                                }))
                              }
                              placeholder='Type the answer here. If not confirmed, enter "unknown".'
                              rows={3}
                              disabled={classifying || submitting}
                              wrapperClassName="mt-3"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
                    options={serviceCategories.map((c) => ({
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
                Leave blank to let the system assign a matching available vendor.
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

          {/* Overage cost notice on review step */}
          {usage?.isOverLimit && (
            <div className="rounded-md bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Billable request</p>
                <p className="text-amber-700 mt-0.5">
                  You have used <strong>{usage.completedRequests}</strong> of your{" "}
                  <strong>{usage.includedRequests}</strong> included requests this month.
                  Submitting this request will add <strong>${usage.ratePerRequest.toFixed(2)} CAD</strong> to your
                  end-of-month invoice upon completion.
                </p>
              </div>
            </div>
          )}

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
              loading={needsPreSubmitClarification ? classifying : submitting}
              disabled={!editCategory || (needsPreSubmitClarification ? submitting : classifying)}
              onClick={needsPreSubmitClarification ? handleClarificationReview : handleSubmit}
              className="w-full sm:w-auto justify-center"
            >
              {needsPreSubmitClarification
                ? "Update AI Review"
                : uploadProgress ?? (submitting ? "Submitting..." : "Submit Request")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
