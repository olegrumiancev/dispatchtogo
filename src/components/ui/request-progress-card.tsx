import { Fragment } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export interface RequestProgressStep {
  key: string;
  label: string;
}

export interface RequestProgressEvent {
  label: string;
  value: string | Date | null | undefined;
  tone?: "default" | "warning";
}

interface RequestProgressCardProps {
  currentStatus: string;
  steps: RequestProgressStep[];
  events: RequestProgressEvent[];
  title?: string;
}

const BASE_REQUEST_PROGRESS_STATUSES = [
  "SUBMITTED",
  "TRIAGING",
  "NEEDS_CLARIFICATION",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export function getLinearRequestProgressSteps(
  getLabel: (status: string) => string,
  currentStatus: string
): RequestProgressStep[] {
  const finalStatus = currentStatus === "DISPUTED" ? "DISPUTED" : "VERIFIED";

  return [...BASE_REQUEST_PROGRESS_STATUSES, finalStatus].map((status) => ({
    key: status,
    label: getLabel(status),
  }));
}

function getStepState(index: number, currentIndex: number) {
  if (currentIndex === -1) return "upcoming";
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}

export function RequestProgressCard({
  currentStatus,
  steps,
  events,
  title = "Progress",
}: RequestProgressCardProps) {
  const currentIndex = steps.findIndex((step) => step.key === currentStatus);
  const visibleEvents = events.filter((event) => Boolean(event.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, index) => {
            const stepState = getStepState(index, currentIndex);

            return (
              <Fragment key={step.key}>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    stepState === "current"
                      ? "border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100"
                      : stepState === "complete"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  {stepState === "complete" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        stepState === "current" ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                  {step.label}
                </div>
                {index < steps.length - 1 && (
                  <span className="text-xs text-gray-300" aria-hidden="true">
                    {"->"}
                  </span>
                )}
              </Fragment>
            );
          })}
        </div>

        {visibleEvents.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleEvents.map((event) => (
              <div
                key={`${event.label}-${String(event.value)}`}
                className={`rounded-lg border px-3 py-3 ${
                  event.tone === "warning"
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  {event.label}
                </div>
                <p
                  className={`mt-2 text-sm ${
                    event.tone === "warning" ? "text-amber-800" : "text-gray-900"
                  }`}
                >
                  {formatDate(event.value!)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
