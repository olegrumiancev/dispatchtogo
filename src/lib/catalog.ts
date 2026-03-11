import { getSettings } from "@/lib/settings";
import {
  ORGANIZATION_TYPES,
  SERVICE_CATEGORIES,
  type OrganizationTypeOption,
  type ServiceCategoryOption,
} from "@/lib/constants";

function dedupeByValue<T extends { value: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = item.value.trim().toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ ...item, value: key });
  }

  return result;
}

function normalizeServiceCategories(raw: unknown): ServiceCategoryOption[] {
  if (!Array.isArray(raw)) return [...SERVICE_CATEGORIES];

  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value =
        typeof (item as any).value === "string"
          ? (item as any).value.trim().toUpperCase()
          : "";
      const label =
        typeof (item as any).label === "string"
          ? (item as any).label.trim()
          : "";
      const requiresLicense = Boolean((item as any).requiresLicense);
      if (!value || !label) return null;
      return { value, label, requiresLicense };
    })
    .filter((item): item is ServiceCategoryOption => item !== null);

  return parsed.length > 0 ? dedupeByValue(parsed) : [...SERVICE_CATEGORIES];
}

function normalizeOrganizationTypes(raw: unknown): OrganizationTypeOption[] {
  if (!Array.isArray(raw)) return [...ORGANIZATION_TYPES];

  const parsed = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value =
        typeof (item as any).value === "string"
          ? (item as any).value.trim().toUpperCase()
          : "";
      const label =
        typeof (item as any).label === "string"
          ? (item as any).label.trim()
          : "";
      if (!value || !label) return null;
      return { value, label };
    })
    .filter((item): item is OrganizationTypeOption => item !== null);

  return parsed.length > 0 ? dedupeByValue(parsed) : [...ORGANIZATION_TYPES];
}

export async function getServiceCategories(): Promise<ServiceCategoryOption[]> {
  const settings = await getSettings();
  return normalizeServiceCategories(settings.serviceCategories);
}

export async function getOrganizationTypes(): Promise<OrganizationTypeOption[]> {
  const settings = await getSettings();
  return normalizeOrganizationTypes(settings.organizationTypes);
}

export async function getCatalogOptions() {
  const [serviceCategories, organizationTypes] = await Promise.all([
    getServiceCategories(),
    getOrganizationTypes(),
  ]);

  return {
    serviceCategories,
    organizationTypes,
  };
}

export function getServiceCategoryLabel(
  categories: Array<ServiceCategoryOption>,
  value: string
) {
  return categories.find((category) => category.value === value)?.label ?? value;
}

export function getOrganizationTypeLabel(
  types: Array<OrganizationTypeOption>,
  value: string
) {
  return types.find((type) => type.value === value)?.label ?? value;
}
