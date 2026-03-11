"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  RequestProgressCard,
  getLinearRequestProgressSteps,
} from "@/components/ui/request-progress-card";
import { optimizeImageFileForUpload } from "@/lib/client-image";
import {
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  SERVICE_CATEGORIES,
} from "@/lib/constants";
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
  Sparkles,
  ImageIcon,
  Brain,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

const SUBMISSION_LOCKED_STATUSES = new Set([
  "COMPLETED",
  "VERIFIED",
  "CANCELLED",
]);
const MATERIAL_HINT_PATTERN =
  /(replace|repair|install|pipe|part|fixture|valve|switch|material)/i;

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
  fullUrl?: string | null;
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
  createdAt: Date | string;
  resolvedAt: Date | string | null;
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
  completionSummary: string | null;
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
  vendorBrief?: {
    summary: string | null;
    category: string;
    urgency: string;
    requiresLicensedTrade: boolean;
    clarifyingQuestions: string[];
    reasoning?: string | null;
  } | null;
}

interface VendorJobDetailProps {
  job: Job;
}

interface CompletionAssist {
  summary: string;
  proofSummary: string;
  missingEvidenceFlags: string[];
  confidence: number;
}

type JobStatusAction = "accept" | "enroute" | "arrive" | "complete";
type VendorSectionKey =
  | "requestPhotos"
  | "workPhotos"
  | "materials"
  | "completion";
type WorkflowStepKey = "overview" | "proof" | "complete";
type ValidationFocusTarget =
  | "afterPhoto"
  | "beforePhoto"
  | "materials"
  | "completionSummary";

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

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function formatEvidenceFlag(flag: string) {
  const explicit: Record<string, string> = {
    no_vendor_notes: "Add vendor notes describing the work performed.",
    no_diagnosis_documented: "Document the diagnosis or root cause.",
    no_repair_description: "Describe the repair or work completed.",
    materials_lack_detail: "Add clearer material details or save line items.",
    no_labour_hours_recorded: "Record labour hours.",
    no_material_costs_recorded: "Add material cost details.",
    no_total_cost_recorded: "Add the total cost.",
    no_before_photo: "Upload at least one before photo.",
    no_after_photo: "Upload at least one after photo.",
    no_completion_summary: "Add a completion summary.",
  };

  if (explicit[flag]) return explicit[flag];
  if (!flag.includes("_")) return flag;

  const humanized = flag
    .replace(/^no_/, "Add ")
    .replace(/_/g, " ")
    .replace(/\bdetail\b/g, "details");

  return humanized.charAt(0).toUpperCase() + humanized.slice(1) + ".";
}

function AssistSummaryText({ text }: { text: string }) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const firstNumberIndex = normalized.search(/\b1[\)\.]\s+/);

  if (firstNumberIndex === -1) {
    return <p className="text-sm text-blue-900">{normalized}</p>;
  }

  const lead = normalized.slice(0, firstNumberIndex).trim();
  const listSource = normalized.slice(firstNumberIndex).trim();
  const rawItems = listSource
    .split(/\s+(?=\d+[\)\.]\s+)/)
    .map((item) => item.replace(/^\d+[\)\.]\s*/, "").trim())
    .filter(Boolean);

  if (rawItems.length < 2) {
    return <p className="text-sm text-blue-900">{normalized}</p>;
  }

  let tail = "";
  const items = [...rawItems];
  const lastItem = items[items.length - 1];
  const tailMatch = lastItem.match(/^(.*?\.)\s+((?:Without|These|This)\b.*)$/i);

  if (tailMatch) {
    items[items.length - 1] = tailMatch[1].trim();
    tail = tailMatch[2].trim();
  }

  return (
    <div className="space-y-3">
      {lead && <p className="text-sm text-blue-900">{lead}</p>}
      <ol className="list-decimal space-y-1 pl-5 text-sm text-blue-900">
        {items.map((item, index) => (
          <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
        ))}
      </ol>
      {tail && <p className="text-sm text-blue-900">{tail}</p>}
    </div>
  );
}

interface NewMaterial {
  tempId: string;
  description: string;
  qty: string; // stored as string so decimals like "0.5" can be typed freely
  unitCost: number;
}

type DeclineKey = "capacity" | "wont_service" | "other";

const DECLINE_OPTIONS: {
  key: DeclineKey;
  label: string;
  value: string | null;
}[] = [
  {
    key: "capacity",
    label: "Over capacity",
    value: "Over capacity — currently unavailable to take on new jobs",
  },
  {
    key: "wont_service",
    label: "Won't service",
    value: "Unable to service this request",
  },
  { key: "other", label: "Other (provide reason)", value: null },
];

export function VendorJobDetail({ job }: VendorJobDetailProps) {
  const router = useRouter();
  const sr = job.serviceRequest;
  const vendorBrief = job.vendorBrief;
  const savedMaterialsTotal = job.materials.reduce(
    (sum, material) => sum + material.unitCost * material.quantity,
    0,
  );

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState(
    job.completionSummary ?? "",
  );
  const [vendorNotesDraft, setVendorNotesDraft] = useState(
    job.vendorNotes ?? "",
  );
  const [labourHoursInput, setLabourHoursInput] = useState(
    job.totalLabourHours != null ? String(job.totalLabourHours) : "",
  );
  const [materialsCostInput, setMaterialsCostInput] = useState(
    job.totalMaterialsCost != null
      ? String(job.totalMaterialsCost)
      : savedMaterialsTotal > 0
        ? String(savedMaterialsTotal)
        : "",
  );
  const [totalCostInput, setTotalCostInput] = useState(
    job.totalCost != null ? String(job.totalCost) : "",
  );
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionAssist, setCompletionAssist] =
    useState<CompletionAssist | null>(null);
  const [completionAssistLoading, setCompletionAssistLoading] = useState(false);

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

  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>(
    {},
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>(job.photos);
  const [pendingPhotos, setPendingPhotos] = useState<
    Record<"BEFORE" | "AFTER", File[]>
  >({
    BEFORE: [],
    AFTER: [],
  });

  const isSubmissionLocked = SUBMISSION_LOCKED_STATUSES.has(sr.status);
  const canEditSubmission = !isSubmissionLocked;
  const canModifyPhotos = canEditSubmission;

  const beforePhotos = photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = photos.filter((p) => p.type === "AFTER");
  const hasAcceptedJob = !!job.acceptedAt;
  const labourHoursValue = parseOptionalNumber(labourHoursInput);
  const materialsCostValue = parseOptionalNumber(materialsCostInput);
  const totalCostValue = parseOptionalNumber(totalCostInput);
  const hasPendingMaterialDrafts = newMaterials.some(
    (m) => m.description.trim() || Number(m.unitCost) > 0,
  );
  const materialEntriesForReview = [
    ...job.materials.map((material) => ({
      description: material.description,
      quantity: material.quantity,
      unitCost: material.unitCost,
    })),
    ...newMaterials
      .filter((material) => material.description.trim())
      .map((material) => ({
        description: material.description.trim(),
        quantity: parseFloat(material.qty) || 1,
        unitCost: material.unitCost,
      })),
  ];
  const needsMaterialContext =
    MATERIAL_HINT_PATTERN.test(sr.description) ||
    materialEntriesForReview.length > 0 ||
    materialsCostValue != null;
  const completionChecklist = [
    {
      label: "Completion summary",
      help: "Describe what you fixed and the final result.",
      done: !!completionSummary.trim(),
      required: true,
    },
    {
      label: "After photo",
      help: "At least one completion photo is required before submission.",
      done: afterPhotos.length > 0,
      required: true,
    },
    {
      label: "Before photo",
      help: "Recommended when showing before/after work.",
      done: beforePhotos.length > 0,
      required: false,
    },
    {
      label: "Vendor notes",
      help: "Add operator-facing context, follow-up, or access notes.",
      done: !!vendorNotesDraft.trim(),
      required: false,
    },
    {
      label: "Labour hours",
      help: "Record time spent on site.",
      done: labourHoursValue != null,
      required: false,
    },
    {
      label: "Materials detail",
      help: needsMaterialContext
        ? "Save line items or record a material cost if materials were used."
        : "Optional if no materials were used.",
      done:
        !needsMaterialContext ||
        materialEntriesForReview.length > 0 ||
        materialsCostValue != null,
      required: false,
    },
    {
      label: "Total cost",
      help: "Recommended for billable jobs.",
      done: totalCostValue != null,
      required: false,
    },
  ];
  const missingRequiredChecklist = completionChecklist.filter(
    (item) => item.required && !item.done,
  );
  const completedChecklistCount = completionChecklist.filter(
    (item) => item.done,
  ).length;
  const canCompleteNow =
    missingRequiredChecklist.length === 0 && !hasPendingMaterialDrafts;
  const blockingCompletionItems = [
    ...(hasPendingMaterialDrafts
      ? [
          {
            id: "pending-materials",
            label: "Save or remove pending material items",
            help: "Finish the draft material list before you submit.",
            step: "proof" as WorkflowStepKey,
            focus: "materials" as ValidationFocusTarget,
          },
        ]
      : []),
    ...missingRequiredChecklist.map((item) => {
      switch (item.label) {
        case "After photo":
          return {
            id: "after-photo",
            label: "Upload at least one after photo",
            help: item.help,
            step: "proof" as WorkflowStepKey,
            focus: "afterPhoto" as ValidationFocusTarget,
          };
        case "Before photo":
          return {
            id: "before-photo",
            label: "Add a before photo",
            help: item.help,
            step: "proof" as WorkflowStepKey,
            focus: "beforePhoto" as ValidationFocusTarget,
          };
        default:
          return {
            id: "completion-summary",
            label: "Add a completion summary",
            help: item.help,
            step: "complete" as WorkflowStepKey,
            focus: "completionSummary" as ValidationFocusTarget,
          };
      }
    }),
  ];
  const initialWorkflowStep: WorkflowStepKey = !hasAcceptedJob
    ? "overview"
    : sr.status === "COMPLETED" || sr.status === "VERIFIED"
      ? "complete"
      : canCompleteNow
        ? "complete"
        : "proof";
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState<WorkflowStepKey>(initialWorkflowStep);
  const overviewPanelRef = useRef<HTMLDivElement | null>(null);
  const proofPanelRef = useRef<HTMLDivElement | null>(null);
  const completePanelRef = useRef<HTMLDivElement | null>(null);
  const beforePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const afterPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const beforePhotoButtonRef = useRef<HTMLButtonElement | null>(null);
  const afterPhotoButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveMaterialsButtonRef = useRef<HTMLButtonElement | null>(null);
  const completionSummaryFieldId = `job-${job.id}-completion-summary`;
  const workflowSteps = [
    {
      key: "overview" as WorkflowStepKey,
      label: "Overview",
      hint: hasAcceptedJob
        ? "Request, property, and intake"
        : "Review the job before accepting",
      complete: hasAcceptedJob,
    },
    ...(hasAcceptedJob
      ? [
          {
            key: "proof" as WorkflowStepKey,
            label: "Work Proof",
            hint: `${beforePhotos.length} before, ${afterPhotos.length} after`,
            complete: afterPhotos.length > 0 && !hasPendingMaterialDrafts,
          },
          {
            key: "complete" as WorkflowStepKey,
            label: canEditSubmission ? "Complete Job" : "Submitted Proof",
            hint: canEditSubmission
              ? canCompleteNow
                ? "Ready to submit"
                : `${blockingCompletionItems.length} item${blockingCompletionItems.length === 1 ? "" : "s"} need attention`
              : `${completedChecklistCount}/${completionChecklist.length} items captured`,
            complete: canCompleteNow || !canEditSubmission,
          },
        ]
      : []),
  ];
  const currentStage = job.isPaused
    ? {
        label: "Paused - Will Return",
        detail: "Work is paused until you resume the job.",
        badge: "bg-amber-100 text-amber-800",
      }
    : sr.status === "DISPATCHED"
      ? {
          label: "Dispatched",
          detail: "Waiting for you to accept or decline the job.",
          badge: "bg-slate-100 text-slate-700",
        }
      : sr.status === "ACCEPTED" && !job.enRouteAt
        ? {
            label: "Accepted",
            detail: "You have the job, but you have not marked yourself en route yet.",
            badge: "bg-blue-100 text-blue-800",
          }
        : sr.status === "ACCEPTED" && job.enRouteAt && !job.arrivedAt
          ? {
              label: "En Route",
              detail: "Travel is in progress and arrival on site is the next milestone.",
              badge: "bg-sky-100 text-sky-800",
            }
          : sr.status === "IN_PROGRESS" && job.arrivedAt
            ? {
                label: "On Site",
                detail: "You have arrived and the job is now in progress.",
                badge: "bg-indigo-100 text-indigo-800",
              }
            : sr.status === "IN_PROGRESS"
              ? {
                  label: "In Progress",
                  detail: "Work is underway.",
                  badge: "bg-indigo-100 text-indigo-800",
                }
              : {
                  label: getStatusLabel(sr.status),
                  detail: "Review the next action below.",
                  badge: "bg-gray-100 text-gray-700",
                };
  const statusPrimaryActionLabel = canCompleteNow
    ? "Review & Submit"
    : blockingCompletionItems.some((item) => item.step === "proof")
      ? "Continue Work Proof"
      : "Finish Completion Summary";
  const defaultOpenSections: Record<VendorSectionKey, boolean> = {
    requestPhotos: true,
    workPhotos: true,
    materials: true,
    completion: true,
  };
  const [openSections, setOpenSections] =
    useState<Record<VendorSectionKey, boolean>>(defaultOpenSections);
  const recommendedSection: VendorSectionKey = !hasAcceptedJob
    ? "requestPhotos"
    : sr.status === "COMPLETED" || sr.status === "VERIFIED"
      ? "completion"
      : afterPhotos.length === 0
        ? "workPhotos"
        : hasPendingMaterialDrafts
          ? "materials"
          : "completion";
  const sectionNavItems = [
    {
      key: "requestPhotos" as VendorSectionKey,
      label: "Request Photos",
      hint:
        sr.photos.length > 0
          ? `${sr.photos.length} attached`
          : "No intake photos",
      complete: sr.photos.length > 0,
    },
    ...(hasAcceptedJob
      ? [
          {
            key: "workPhotos" as VendorSectionKey,
            label: "Work Photos",
            hint: `${beforePhotos.length} before, ${afterPhotos.length} after`,
            complete: afterPhotos.length > 0,
          },
          {
            key: "materials" as VendorSectionKey,
            label: "Materials",
            hint:
              materialEntriesForReview.length > 0
                ? `${materialEntriesForReview.length} saved or drafted`
                : needsMaterialContext
                  ? "Add if materials were used"
                  : "Optional",
            complete:
              !needsMaterialContext ||
              materialEntriesForReview.length > 0 ||
              materialsCostValue != null,
          },
          {
            key: "completion" as VendorSectionKey,
            label: canEditSubmission ? "Completion Proof" : "Submitted Proof",
            hint: `${completedChecklistCount}/${completionChecklist.length} items captured`,
            complete: missingRequiredChecklist.length === 0,
          },
        ]
      : []),
  ];

  const resetCompletionReview = () => {
    setCompletionAssist(null);
  };

  const focusWorkflowStep = (
    step: WorkflowStepKey,
    target?: ValidationFocusTarget,
  ) => {
    setActiveWorkflowStep(step);
    setOpenSections((prev) => ({
      ...prev,
      requestPhotos: step === "overview" ? true : prev.requestPhotos,
      workPhotos: step === "proof" ? true : prev.workPhotos,
      materials: step === "proof" ? true : prev.materials,
      completion: step === "complete" ? true : prev.completion,
    }));
    window.setTimeout(() => {
      const panel =
        step === "overview"
          ? overviewPanelRef.current
          : step === "proof"
            ? proofPanelRef.current
            : completePanelRef.current;

      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (!target) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (target === "afterPhoto") {
        afterPhotoButtonRef.current?.focus();
        return;
      }

      if (target === "beforePhoto") {
        beforePhotoButtonRef.current?.focus();
        return;
      }

      if (target === "materials") {
        saveMaterialsButtonRef.current?.focus();
        return;
      }

      if (target === "completionSummary") {
        (
          document.getElementById(
            completionSummaryFieldId,
          ) as HTMLTextAreaElement | null
        )?.focus();
      }
    }, 80);
  };

  const goToCompletionWorkspace = () => {
    if (blockingCompletionItems.length > 0) {
      const firstBlockingItem = blockingCompletionItems[0];
      focusWorkflowStep(firstBlockingItem.step, firstBlockingItem.focus);
      return;
    }

    focusWorkflowStep("complete");
  };

  const openAndScrollToSection = (section: VendorSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: true }));
    if (section === "requestPhotos") {
      focusWorkflowStep("overview");
      return;
    }
    if (section === "completion") {
      focusWorkflowStep("complete");
      return;
    }
    focusWorkflowStep("proof");
  };

  const toggleSection = (section: VendorSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSectionHeader = (
    section: VendorSectionKey,
    title: string,
    meta: string,
    actions?: ReactNode,
  ) => (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="group min-w-0 flex-1 text-left"
      >
        <div className="min-w-0">
          <CardTitle className="text-base text-gray-900">{title}</CardTitle>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500">
            {meta}
          </p>
        </div>
      </button>
      <div className="flex flex-shrink-0 items-center gap-3">
        {actions ? <div className="flex-shrink-0">{actions}</div> : null}
        <button
          type="button"
          onClick={() => toggleSection(section)}
          aria-label={`${openSections[section] ? "Collapse" : "Expand"} ${title}`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              openSections[section] ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    photoType: "BEFORE" | "AFTER",
  ) => {
    if (!canModifyPhotos) return;
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
          const optimizedFile = await optimizeImageFileForUpload(file);
          const fd = new FormData();
          fd.append("file", optimizedFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: fd,
          });
          if (!uploadRes.ok) {
            const d = await uploadRes.json().catch(() => ({}));
            throw new Error(d.error ?? "Upload failed");
          }
          const uploaded = await uploadRes.json();
          const saveRes = await fetch(`/api/jobs/${job.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "photo",
              url: uploaded.url,
              fullUrl: uploaded.fullUrl ?? null,
              thumbnailUrl: uploaded.thumbnailUrl ?? null,
              photoType,
            }),
          });
          if (!saveRes.ok) {
            const d = await saveRes.json().catch(() => ({}));
            throw new Error(d.error ?? "Failed to save photo");
          }
          const createdPhoto = await saveRes.json();
          uploadedAny = true;
          resetCompletionReview();
          setPhotos((prev) => [
            ...prev,
            {
              id: createdPhoto.id,
              url: createdPhoto.url,
              fullUrl: createdPhoto.fullUrl ?? null,
              type: createdPhoto.type,
              thumbnailUrl: createdPhoto.thumbnailUrl ?? null,
            },
          ]);
        } catch (fileErr: any) {
          failedFiles.push(file);
          if (!firstError)
            firstError = fileErr.message ?? "Photo upload failed";
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
      const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete photo");
      }
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      resetCompletionReview();
      router.refresh();
    } catch (err: any) {
      setPhotoError(err.message ?? "Delete failed");
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleStatusAction = async (
    action: JobStatusAction | "decline",
    declineReason?: string,
  ) => {
    if (action === "complete") {
      if (hasPendingMaterialDrafts) {
        setActionError(
          "Save or remove pending material items before marking complete.",
        );
        focusWorkflowStep("proof", "materials");
        return;
      }
      if (missingRequiredChecklist.length > 0) {
        const missingLabels = missingRequiredChecklist
          .map((item) => item.label.toLowerCase())
          .join(" and ");
        setActionError(`Before marking complete, add ${missingLabels}.`);
        if (
          missingRequiredChecklist.some((item) => item.label === "After photo")
        ) {
          focusWorkflowStep("proof", "afterPhoto");
        } else if (
          missingRequiredChecklist.some((item) => item.label === "Before photo")
        ) {
          focusWorkflowStep("proof", "beforePhoto");
        } else {
          focusWorkflowStep("complete", "completionSummary");
        }
        return;
      }
    }

    setActionLoading(true);
    setActionError(null);
    setCompletionError(null);
    try {
      const body: Record<string, string | number | null> = { action };
      if (declineReason) body.declineReason = declineReason;
      if (action === "complete") {
        body.completionSummary = completionSummary.trim() || null;
        body.vendorNotes = vendorNotesDraft.trim() || null;
        body.totalLabourHours = labourHoursInput.trim()
          ? Number(labourHoursInput)
          : null;
        body.totalMaterialsCost = materialsCostInput.trim()
          ? Number(materialsCostInput)
          : null;
        body.totalCost = totalCostInput.trim() ? Number(totalCostInput) : null;
      }
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

  const handleSaveCompletionDraft = async () => {
    if (!canEditSubmission) {
      setCompletionError("Completion proof is locked after submission.");
      return;
    }
    setSavingCompletion(true);
    setCompletionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorNotes: vendorNotesDraft.trim() || null,
          completionSummary: completionSummary.trim() || null,
          totalLabourHours: labourHoursInput.trim()
            ? Number(labourHoursInput)
            : null,
          totalMaterialsCost: materialsCostInput.trim()
            ? Number(materialsCostInput)
            : null,
          totalCost: totalCostInput.trim() ? Number(totalCostInput) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCompletionError(data.error ?? "Failed to save completion details.");
        return;
      }

      resetCompletionReview();
      router.refresh();
    } catch {
      setCompletionError("Network error. Please try again.");
    } finally {
      setSavingCompletion(false);
    }
  };

  const handleGenerateCompletionAssist = async () => {
    if (!canEditSubmission) return;
    setCompletionAssistLoading(true);
    setCompletionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/completion-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionSummary: completionSummary.trim() || null,
          vendorNotes: vendorNotesDraft.trim() || null,
          totalLabourHours: labourHoursValue,
          totalMaterialsCost: materialsCostValue,
          totalCost: totalCostValue,
          noteCount: job.notes.length,
          beforeCount: beforePhotos.length,
          afterCount: afterPhotos.length,
          materialEntries: materialEntriesForReview,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCompletionError(
          data.error ?? "Failed to review completion evidence.",
        );
        return;
      }

      const assist = (data.data ?? data) as CompletionAssist;
      setCompletionAssist(assist);
    } catch {
      setCompletionError("Network error. Please try again.");
    } finally {
      setCompletionAssistLoading(false);
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
    if (!canEditSubmission) {
      setNoteError("Notes are locked after completion is submitted.");
      return;
    }
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
      resetCompletionReview();
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
      { tempId: Date.now().toString(), description: "", qty: "1", unitCost: 0 },
    ]);
  };

  const updateNewMaterial = (
    tempId: string,
    field: keyof NewMaterial,
    value: string | number,
  ) => {
    setNewMaterials((prev) =>
      prev.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m)),
    );
  };

  const removeNewMaterial = (tempId: string) => {
    setNewMaterials((prev) => prev.filter((m) => m.tempId !== tempId));
  };

  const handleSaveMaterials = async () => {
    const toSave = newMaterials.filter((m) => m.description.trim());
    if (toSave.length === 0) return;
    if (!canEditSubmission) {
      setMaterialError("Materials are locked after completion is submitted.");
      return;
    }
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
              quantity: parseFloat(m.qty) || 1,
              unitCost: m.unitCost,
            }),
          }),
        ),
      );
      setNewMaterials([]);
      resetCompletionReview();
      router.refresh();
    } catch {
      setMaterialError("Network error. Please try again.");
    } finally {
      setSavingMaterials(false);
    }
  };

  const existingMaterialsTotal = savedMaterialsTotal;
  const newMaterialsTotal = newMaterials.reduce(
    (sum, m) => sum + (parseFloat(m.qty) || 0) * m.unitCost,
    0,
  );

  // Tomorrow's date for the min on the return date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <Link
        href="/app/vendor/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      {/* Job header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {sr.referenceNumber}
        </h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant={getUrgencyColor(sr.urgency)}>{sr.urgency}</Badge>
          <Badge variant="bg-gray-100 text-gray-700">
            {getCategoryLabel(sr.category)}
          </Badge>
          {job.isPaused ? (
            <Badge variant="bg-amber-100 text-amber-800">
              Paused — Will Return
            </Badge>
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
            <p className="text-sm font-semibold text-amber-800">
              Job paused — you need to return
            </p>
            {job.pauseReason && (
              <p className="text-sm text-amber-700 mt-0.5">{job.pauseReason}</p>
            )}
            {job.estimatedReturnDate && (
              <p className="text-xs text-amber-600 mt-1">
                Expected return:{" "}
                {new Date(job.estimatedReturnDate).toLocaleDateString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
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
            <p className="text-sm font-semibold text-amber-800">
              Work sent back for rework
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {sr.rejectionReason}
            </p>
          </div>
        </div>
      )}

      <RequestProgressCard
        currentStatus={sr.status}
        steps={getLinearRequestProgressSteps(getStatusLabel, sr.status)}
        events={[
          { label: "Submitted", value: sr.createdAt },
          { label: "Accepted", value: job.acceptedAt },
          { label: "En Route", value: job.enRouteAt },
          { label: "Arrived", value: job.arrivedAt },
          {
            label: "Paused",
            value: job.isPaused ? job.pausedAt : null,
            tone: "warning",
          },
          { label: "Completed", value: job.completedAt },
          { label: "Resolved", value: sr.resolvedAt },
        ]}
      />

      {workflowSteps.length > 1 && (
        <Card className="border-gray-200/80">
          <CardContent className="space-y-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Job Workspace
                </p>
                <p className="text-xs text-gray-500">
                  Move through one step at a time instead of hunting through the
                  full page.
                </p>
              </div>
              {hasAcceptedJob && canEditSubmission && (
                <div
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    canCompleteNow
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {canCompleteNow
                    ? "Required proof complete"
                    : `${blockingCompletionItems.length} submission item${blockingCompletionItems.length === 1 ? "" : "s"} left`}
                </div>
              )}
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {workflowSteps.map((step, index) => {
                const isActive = activeWorkflowStep === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => focusWorkflowStep(step.key)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                          step.complete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : isActive
                              ? "border-blue-300 bg-white text-blue-700"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}
                      >
                        {step.complete ? (
                          <CheckCircle className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {step.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {step.hint}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasAcceptedJob && canEditSubmission && blockingCompletionItems.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">
                  Submission shortcuts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {blockingCompletionItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => focusWorkflowStep(item.step, item.focus)}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100/70"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status action button */}
      {sr.status !== "COMPLETED" &&
        sr.status !== "VERIFIED" &&
        sr.status !== "CANCELLED" &&
        !job.isPaused && (
          <Card>
            <CardContent className="py-5">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Current Status
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={currentStage.badge}>{currentStage.label}</Badge>
                    <p className="text-xs text-gray-500">{currentStage.detail}</p>
                  </div>
                  {actionError && (
                    <p className="text-xs text-red-600 mt-0.5">{actionError}</p>
                  )}
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
                  {sr.status === "ACCEPTED" &&
                    job.enRouteAt &&
                    !job.arrivedAt && (
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
                  {/* If in progress, steer into the workspace instead of completing from the top */}
                  {sr.status === "IN_PROGRESS" && (
                    <>
                      <Button
                        variant="primary"
                        onClick={goToCompletionWorkspace}
                        className="w-full sm:w-auto justify-center min-h-[44px]"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {statusPrimaryActionLabel}
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPauseModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pause Job
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Need to order parts, wait for delivery, or come back another
                  day? Pause the job and resume when ready.
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
                Why are you pausing?{" "}
                <span className="text-gray-400 text-xs font-normal">
                  (recommended)
                </span>
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
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pausing…
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause Job
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeWorkflowStep === "overview" && (
        <>
      {/* Job info */}
      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {sr.property.name}
              </p>
              {sr.property.address && (
                <p className="text-xs text-gray-500">{sr.property.address}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </p>
            <p className="text-sm text-gray-700 mt-1">{sr.description}</p>
          </div>
        </CardContent>
      </Card>

      {vendorBrief && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Job Brief</CardTitle>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                AI-assisted
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Brain className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                      {getCategoryLabel(vendorBrief.category)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                      {vendorBrief.urgency}
                    </span>
                    {vendorBrief.requiresLicensedTrade && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" />
                        Licensed trade likely required
                      </span>
                    )}
                  </div>

                  {vendorBrief.summary && (
                    <p className="text-sm text-blue-950">
                      {vendorBrief.summary}
                    </p>
                  )}

                  {vendorBrief.reasoning && (
                    <p className="text-xs text-blue-800">
                      {vendorBrief.reasoning}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {vendorBrief.clarifyingQuestions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Questions To Confirm On Site
                </p>
                <ul className="space-y-2">
                  {vendorBrief.clarifyingQuestions.map((question, index) => (
                    <li
                      key={`${index}-${question.slice(0, 24)}`}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {false && sectionNavItems.length > 1 && (
        <div className="sticky top-3 z-20 -mx-1">
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white/90 p-2 shadow-sm backdrop-blur">
            <div className="flex min-w-max gap-2">
              {sectionNavItems.map((item) => {
                const isOpen = openSections[item.key];
                const isRecommended = item.key === recommendedSection;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openAndScrollToSection(item.key)}
                    className={`min-w-[140px] rounded-xl border px-3 py-2 text-left transition-colors ${
                      isOpen
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {item.label}
                      </span>
                      {isRecommended ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                          Next
                        </span>
                      ) : item.complete ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section
        id="vendor-section-requestPhotos"
        ref={overviewPanelRef}
        className="scroll-mt-24"
      >
        <Card className="overflow-hidden">
          <CardHeader>
            {renderSectionHeader(
              "requestPhotos",
              "Request Photos",
              `${sr.photos.length} attached`,
            )}
          </CardHeader>
          {openSections.requestPhotos && (
            <CardContent>
              {sr.photos.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                  No intake photos were provided with this request.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Review the intake photos before accepting so you can judge
                    condition, access, and scope.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {sr.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.fullUrl ?? photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group overflow-hidden rounded-lg border border-gray-200 bg-white"
                      >
                        <img
                          src={photo.thumbnailUrl ?? photo.url}
                          alt="Request intake photo"
                          className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="text-xs font-medium text-gray-700">
                            {photo.type === "INTAKE" ? "Intake" : photo.type}
                          </span>
                          <span className="text-xs text-blue-600 group-hover:text-blue-700">
                            Open
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </section>

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
                  <span className="text-xs text-gray-400">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{note.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
        </>
      )}

      {activeWorkflowStep === "proof" && hasAcceptedJob && (
        <>
          <section
            id="vendor-section-workPhotos"
            ref={proofPanelRef}
            className="scroll-mt-24"
          >
            <Card className="overflow-hidden">
              <CardHeader>
                {renderSectionHeader(
                  "workPhotos",
                  "Before / After Photos",
                  `${beforePhotos.length} before, ${afterPhotos.length} after`,
                )}
              </CardHeader>
              {openSections.workPhotos && (
                <CardContent className="space-y-5">
                  {photoError && (
                    <p className="text-xs text-red-600">{photoError}</p>
                  )}
                  {(["BEFORE", "AFTER"] as const).map((type) => {
                    const photos =
                      type === "BEFORE" ? beforePhotos : afterPhotos;
                    const uploading = !!photoUploading[type];
                    const queuedCount = pendingPhotos[type].length;
                    const photoInputRef =
                      type === "BEFORE"
                        ? beforePhotoInputRef
                        : afterPhotoInputRef;
                    const photoSelectButtonRef =
                      type === "BEFORE"
                        ? beforePhotoButtonRef
                        : afterPhotoButtonRef;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {type === "BEFORE" ? "Before" : "After"}
                          </p>
                          {canModifyPhotos && (
                            <div className="flex items-center gap-2">
                              <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploading}
                                className="sr-only"
                                onChange={(e) => handlePhotoUpload(e, type)}
                              />
                              <Button
                                ref={photoSelectButtonRef}
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={uploading}
                                onClick={() => {
                                  if (photoInputRef.current) {
                                    photoInputRef.current.value = "";
                                    photoInputRef.current.click();
                                  }
                                }}
                              >
                                <Camera className="w-3.5 h-3.5" />
                                Select Photos
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                loading={uploading}
                                disabled={uploading || queuedCount === 0}
                                onClick={() => handleUploadPendingPhotos(type)}
                              >
                                Upload{" "}
                                {queuedCount > 0 ? `(${queuedCount})` : ""}
                              </Button>
                            </div>
                          )}
                        </div>
                        {canModifyPhotos && queuedCount > 0 && (
                          <p className="text-xs text-gray-500 mb-2">
                            {queuedCount} photo(s) queued for upload
                          </p>
                        )}
                        {photos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-3">
                            {photos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <a
                                  href={photo.fullUrl ?? photo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                                    <img
                                      src={photo.thumbnailUrl ?? photo.url}
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
                              {canModifyPhotos
                                ? "No photos yet - tap Add Photo"
                                : "No photos"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          </section>

          <section id="vendor-section-materials" className="scroll-mt-24">
            <Card className="overflow-hidden">
              <CardHeader>
                {renderSectionHeader(
                  "materials",
                  "Materials Used",
                  materialEntriesForReview.length > 0
                    ? `${materialEntriesForReview.length} saved or drafted`
                    : "Optional unless materials were used",
                  canEditSubmission ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addNewMaterial}
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </Button>
                  ) : undefined,
                )}
              </CardHeader>
              {openSections.materials && (
                <CardContent>
                  {!canEditSubmission && (
                    <p className="mb-4 text-xs text-gray-500">
                      Materials are locked after completion is submitted.
                    </p>
                  )}
                  {/* Saved materials */}
                  {job.materials.length > 0 && (
                    <div className="space-y-1 mb-4">
                      {job.materials.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-sm py-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-gray-700">
                              {m.description}
                            </span>
                            <span className="text-gray-400">
                              x {m.quantity}
                            </span>
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
                    <div className="space-y-2">
                      {materialError && (
                        <p className="text-xs text-red-600">{materialError}</p>
                      )}

                      {/* Column headers */}
                      <div className="hidden sm:grid sm:grid-cols-[1fr_80px_120px_80px_44px] gap-2 px-1">
                        <span className="text-xs font-medium text-gray-500">
                          Description
                        </span>
                        <span className="text-xs font-medium text-gray-500 text-center">
                          Qty
                        </span>
                        <span className="text-xs font-medium text-gray-500 text-right">
                          Unit Price
                        </span>
                        <span className="text-xs font-medium text-gray-500 text-right">
                          Line Total
                        </span>
                        <span />
                      </div>

                      {newMaterials.map((m) => {
                        const lineTotal = (parseFloat(m.qty) || 0) * m.unitCost;
                        return (
                          <div
                            key={m.tempId}
                            className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_120px_80px_44px] gap-2 items-start sm:items-center"
                          >
                            {/* Description */}
                            <div className="w-full">
                              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-0.5">
                                Description
                              </label>
                              <input
                                type="text"
                                placeholder='e.g. 1/2" PVC pipe'
                                value={m.description}
                                onChange={(e) =>
                                  updateNewMaterial(
                                    m.tempId,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                disabled={!canEditSubmission}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Qty — stored as string so fractions like 0.5 can be typed */}
                            <div className="w-full sm:w-auto">
                              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-0.5">
                                Qty (fractions OK)
                              </label>
                              <input
                                type="number"
                                placeholder="1"
                                value={m.qty}
                                min={0}
                                step="any"
                                onChange={(e) =>
                                  updateNewMaterial(
                                    m.tempId,
                                    "qty",
                                    e.target.value,
                                  )
                                }
                                disabled={!canEditSubmission}
                                className="w-full sm:w-20 rounded-md border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* Unit Price */}
                            <div className="w-full sm:w-auto">
                              <label className="sm:hidden block text-xs font-medium text-gray-500 mb-0.5">
                                Unit Price ($)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                                  $
                                </span>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={m.unitCost === 0 ? "" : m.unitCost}
                                  min={0}
                                  step={0.01}
                                  onChange={(e) =>
                                    updateNewMaterial(
                                      m.tempId,
                                      "unitCost",
                                      Number(e.target.value),
                                    )
                                  }
                                  disabled={!canEditSubmission}
                                  className="w-full rounded-md border border-gray-300 pl-6 pr-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* Line total (read-only) */}
                            <div className="hidden sm:flex items-center justify-end">
                              <span className="text-sm font-medium text-gray-700">
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>

                            {/* Delete */}
                            <div className="flex sm:justify-center">
                              <button
                                onClick={() => removeNewMaterial(m.tempId)}
                                disabled={!canEditSubmission}
                                className="p-2 min-h-[44px] min-w-[44px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">
                          New items total: {formatCurrency(newMaterialsTotal)}
                        </p>
                        <Button
                          ref={saveMaterialsButtonRef}
                          variant="primary"
                          size="sm"
                          loading={savingMaterials}
                          disabled={!canEditSubmission}
                          onClick={handleSaveMaterials}
                        >
                          Save Materials
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </section>
        </>
      )}

      {activeWorkflowStep === "proof" && (
        <>
      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>{canEditSubmission ? "Work Notes" : "Notes"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canEditSubmission && (
            <p className="text-xs text-gray-500">
              Additional notes are locked after completion is submitted.
            </p>
          )}
          {noteError && <p className="text-xs text-red-600">{noteError}</p>}
          <Textarea
            placeholder="Add notes about the work performed, findings, or follow-up required..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={!canEditSubmission}
            rows={4}
          />
          {canEditSubmission && (
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
          )}
        </CardContent>
      </Card>
        </>
      )}

      {activeWorkflowStep === "complete" && hasAcceptedJob && (
        <section
          id="vendor-section-completion"
          ref={completePanelRef}
          className="scroll-mt-24"
        >
          <Card className="overflow-hidden">
            <CardHeader>
              {renderSectionHeader(
                "completion",
                canEditSubmission
                  ? "Completion Proof"
                  : "Submitted Completion Proof",
                `${completedChecklistCount}/${completionChecklist.length} items captured`,
                canEditSubmission ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={completionAssistLoading}
                    onClick={handleGenerateCompletionAssist}
                  >
                    <Sparkles className="w-4 h-4" />
                    Review With AI
                  </Button>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Locked after submission
                  </span>
                ),
              )}
            </CardHeader>
            {openSections.completion && (
              <CardContent className="space-y-4">
                {completionError && (
                  <p className="text-xs text-red-600">{completionError}</p>
                )}
                {actionError && (
                  <p className="text-xs text-red-600">{actionError}</p>
                )}

                <div
                  className={`rounded-lg border px-4 py-3 ${
                    canEditSubmission
                      ? canCompleteNow
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-sm font-medium ${
                        canEditSubmission
                          ? canCompleteNow
                            ? "text-emerald-900"
                            : "text-amber-900"
                          : "text-amber-900"
                      }`}
                    >
                      {canEditSubmission
                        ? canCompleteNow
                          ? "Ready to mark complete"
                          : "Before marking complete"
                        : "Submitted proof snapshot"}
                    </p>
                    <span className="text-xs text-gray-500">
                      {completedChecklistCount}/{completionChecklist.length}{" "}
                      items captured
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      canEditSubmission
                        ? canCompleteNow
                          ? "text-emerald-700"
                          : "text-amber-700"
                        : "text-amber-700"
                    }`}
                  >
                    {canEditSubmission
                      ? canCompleteNow
                        ? "The required proof is in place. Review the summary below and submit once."
                        : "Save drafts while working. When the checklist is covered, submit once and move on."
                      : `This proof was submitted ${job.completedAt ? formatDate(job.completedAt) : "after completion"} and is now read-only.`}
                  </p>
                  <div className="mt-3 space-y-2">
                    {completionChecklist.map((item) => (
                      <div
                        key={item.label}
                        className={`rounded-md border px-3 py-2 ${
                          item.done
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {item.done ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                          ) : (
                            <span
                              className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border ${item.required ? "border-amber-500" : "border-gray-300"}`}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {item.label}
                              </p>
                              {item.required && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                                  Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{item.help}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasPendingMaterialDrafts && (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      Save or remove pending material entries before marking
                      complete.
                    </p>
                  )}
                  {canEditSubmission && blockingCompletionItems.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {blockingCompletionItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => focusWorkflowStep(item.step, item.focus)}
                          className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100/70"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {completionAssist && (
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          AI completion coach
                        </p>
                        <p className="text-xs text-blue-700">
                          Uses your draft, notes, photos, and saved materials to
                          tighten the completion story and highlight the next best steps.
                        </p>
                      </div>
                      {canEditSubmission &&
                        completionAssist.summary &&
                        completionAssist.summary.trim() !==
                          completionSummary.trim() && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setCompletionSummary(completionAssist.summary)
                            }
                          >
                            Use Suggested Summary
                          </Button>
                        )}
                    </div>
                    <AssistSummaryText text={completionAssist.proofSummary} />
                    {completionAssist.missingEvidenceFlags.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-700">
                          Next best steps
                        </p>
                        <ul className="space-y-1 text-sm text-blue-900">
                          {completionAssist.missingEvidenceFlags.map(
                            (flag, index) => (
                              <li key={index}>- {formatEvidenceFlag(flag)}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor={completionSummaryFieldId}
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Completion Summary
                  </label>
                  <Textarea
                    id={completionSummaryFieldId}
                    placeholder="Summarize what you completed, what was repaired or replaced, and the final result."
                    value={completionSummary}
                    onChange={(e) => setCompletionSummary(e.target.value)}
                    readOnly={!canEditSubmission}
                    className={
                      !canEditSubmission
                        ? "bg-gray-50 text-gray-600"
                        : undefined
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vendor Notes
                  </label>
                  <Textarea
                    placeholder="Add any additional context, follow-up items, or operator-facing notes."
                    value={vendorNotesDraft}
                    onChange={(e) => setVendorNotesDraft(e.target.value)}
                    readOnly={!canEditSubmission}
                    className={
                      !canEditSubmission
                        ? "bg-gray-50 text-gray-600"
                        : undefined
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                      Labour Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={labourHoursInput}
                      onChange={(e) => setLabourHoursInput(e.target.value)}
                      readOnly={!canEditSubmission}
                      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canEditSubmission ? "bg-gray-50 text-gray-600" : ""}`}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                      Materials Cost
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={materialsCostInput}
                      onChange={(e) => setMaterialsCostInput(e.target.value)}
                      readOnly={!canEditSubmission}
                      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canEditSubmission ? "bg-gray-50 text-gray-600" : ""}`}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total Cost
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={totalCostInput}
                      onChange={(e) => setTotalCostInput(e.target.value)}
                      readOnly={!canEditSubmission}
                      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canEditSubmission ? "bg-gray-50 text-gray-600" : ""}`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {canEditSubmission && (
                  <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
                    <Button
                      variant="secondary"
                      loading={savingCompletion}
                      onClick={handleSaveCompletionDraft}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="primary"
                      loading={actionLoading}
                      onClick={() => handleStatusAction("complete")}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Complete
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </section>
      )}

      {/* ─── Decline reason modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={showDeclineModal}
        onClose={resetDeclineModal}
        title="Decline Job"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This job will be returned to the dispatch queue and assigned to
            another vendor. Please select a reason:
          </p>

          <div className="flex flex-col gap-2">
            {DECLINE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setDeclineKey(opt.key);
                  setOtherDeclineReason("");
                }}
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

          {actionError && <p className="text-xs text-red-600">{actionError}</p>}

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
