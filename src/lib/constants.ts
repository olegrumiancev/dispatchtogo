export type ServiceCategoryOption = {
  value: string;
  label: string;
  requiresLicense: boolean;
};

export type OrganizationTypeOption = {
  value: string;
  label: string;
};

export const SERVICE_CATEGORIES: readonly ServiceCategoryOption[] = [
  { value: "PLUMBING", label: "Plumbing", requiresLicense: true },
  { value: "ELECTRICAL", label: "Electrical", requiresLicense: true },
  { value: "HVAC", label: "HVAC", requiresLicense: true },
  { value: "APPLIANCE", label: "Appliance Repair", requiresLicense: false },
  { value: "LOCKSMITH", label: "Locksmith", requiresLicense: false },
  { value: "SNOW_REMOVAL", label: "Snow Removal", requiresLicense: false },
  { value: "LANDSCAPING", label: "Landscaping", requiresLicense: false },
  { value: "CLEANING", label: "Cleaning", requiresLicense: false },
  { value: "DOCK_MARINA", label: "Dock / Marina", requiresLicense: false },
  { value: "STRUCTURAL", label: "Structural", requiresLicense: false },
  { value: "PEST", label: "Pest Control", requiresLicense: false },
  { value: "GENERAL", label: "General Maintenance", requiresLicense: false },
  { value: "OTHER", label: "Other", requiresLicense: false },
] as const;

export const URGENCY_LEVELS = [
  { value: "LOW", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "EMERGENCY", label: "Emergency", color: "bg-red-100 text-red-800" },
] as const;

export const REQUEST_STATUSES = [
  { value: "SUBMITTED", label: "Submitted", color: "bg-blue-100 text-blue-800" },
  { value: "TRIAGING", label: "AI Triaging", color: "bg-purple-100 text-purple-800" },
  { value: "NEEDS_CLARIFICATION", label: "Needs Info", color: "bg-yellow-100 text-yellow-800" },
  { value: "READY_TO_DISPATCH", label: "Ready", color: "bg-green-100 text-green-800" },
  { value: "DISPATCHED", label: "Dispatched", color: "bg-indigo-100 text-indigo-800" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-teal-100 text-teal-800" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-cyan-100 text-cyan-800" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  { value: "VERIFIED", label: "Verified", color: "bg-green-200 text-green-900" },
  { value: "DISPUTED", label: "Disputed", color: "bg-rose-100 text-rose-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-200 text-gray-600" },
] as const;

export const VENDOR_AVAILABILITY_STATUSES = [
  { value: "AVAILABLE", label: "Available", color: "bg-emerald-100 text-emerald-800", description: "Ready to accept new jobs" },
  { value: "BUSY", label: "Busy", color: "bg-amber-100 text-amber-800", description: "On a job \u2014 will be back soon" },
  { value: "OFF_DUTY", label: "Off Duty", color: "bg-gray-200 text-gray-600", description: "Day off, vacation, or not working" },
] as const;

export const JOB_STATUSES = [
  { value: "OFFERED", label: "Offered", color: "bg-blue-100 text-blue-800" },
  { value: "ACCEPTED", label: "Accepted", color: "bg-teal-100 text-teal-800" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-cyan-100 text-cyan-800" },
  { value: "PAUSED", label: "Paused \u2014 Will Return", color: "bg-amber-100 text-amber-800" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  { value: "DECLINED", label: "Declined", color: "bg-gray-200 text-gray-600" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800" },
] as const;

export const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-800" },
  { value: "PAID", label: "Paid", color: "bg-green-100 text-green-800" },
  { value: "OVERDUE", label: "Overdue", color: "bg-red-100 text-red-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-200 text-gray-600" },
] as const;

// \u2500\u2500\u2500 Billing \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Job statuses that count as a billable completed request */
export const BILLED_JOB_STATUSES = ["COMPLETED", "VERIFIED"] as const;

export const BILLING_PLANS: Record<
  string,
  { label: string; includedRequests: number; ratePerRequest: number }
> = {
  FREE: { label: "Free", includedRequests: 15, ratePerRequest: 0.25 },
  VALUE: { label: "Value", includedRequests: 100, ratePerRequest: 0.25 },
};

/** Visual styles for per-job billing tags shown on request lists and billing page. */
export const BILLING_JOB_TAG_STYLES = {
  FREE:     { label: "Free",             className: "bg-green-100 text-green-700" },
  BILLABLE: { label: "Billable · $0.25", className: "bg-amber-100 text-amber-700" },
} as const;

export const ORGANIZATION_TYPES: readonly OrganizationTypeOption[] = [
  { value: "HOTEL", label: "Hotel" },
  { value: "CAMPGROUND", label: "Campground" },
  { value: "MARINA", label: "Marina" },
  { value: "STR", label: "Short-Term Rental" },
  { value: "OTHER", label: "Other" },
] as const;

export const PLATFORM_BILL_STATUSES = [
  { value: "DRAFT",    label: "Draft",    color: "bg-gray-100 text-gray-800" },
  { value: "SENT",     label: "Sent",     color: "bg-blue-100 text-blue-800" },
  { value: "PAID",     label: "Paid",     color: "bg-green-100 text-green-800" },
  { value: "VOID",     label: "Void",     color: "bg-gray-200 text-gray-500" },
  { value: "PAST_DUE", label: "Past Due", color: "bg-red-100 text-red-800" },
] as const;
