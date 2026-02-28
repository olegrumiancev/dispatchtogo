export const SERVICE_CATEGORIES = [
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
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-200 text-gray-600" },
] as const;

export const INVOICE_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-800" },
  { value: "PAID", label: "Paid", color: "bg-green-100 text-green-800" },
  { value: "OVERDUE", label: "Overdue", color: "bg-red-100 text-red-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-200 text-gray-600" },
] as const;
