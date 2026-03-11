import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getCatalogOptions,
  getOrganizationTypes,
  getServiceCategories,
} from "@/lib/catalog";
import {
  ORGANIZATION_TYPES,
  SERVICE_CATEGORIES,
  type OrganizationTypeOption,
  type ServiceCategoryOption,
} from "@/lib/constants";

function sanitizeServiceCategories(input: unknown): ServiceCategoryOption[] | null {
  if (!Array.isArray(input)) return null;

  const seen = new Set<string>();
  const parsed: ServiceCategoryOption[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const value =
      typeof (item as any).value === "string"
        ? (item as any).value.trim().toUpperCase()
        : "";
    const label =
      typeof (item as any).label === "string" ? (item as any).label.trim() : "";
    const requiresLicense = Boolean((item as any).requiresLicense);
    if (!value || !label || seen.has(value)) continue;
    seen.add(value);
    parsed.push({ value, label, requiresLicense });
  }

  if (parsed.length === 0) return null;
  return parsed;
}

function sanitizeOrganizationTypes(input: unknown): OrganizationTypeOption[] | null {
  if (!Array.isArray(input)) return null;

  const seen = new Set<string>();
  const parsed: OrganizationTypeOption[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const value =
      typeof (item as any).value === "string"
        ? (item as any).value.trim().toUpperCase()
        : "";
    const label =
      typeof (item as any).label === "string" ? (item as any).label.trim() : "";
    if (!value || !label || seen.has(value)) continue;
    seen.add(value);
    parsed.push({ value, label });
  }

  if (parsed.length === 0) return null;
  return parsed;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const catalog = await getCatalogOptions();
  return NextResponse.json(catalog);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const serviceCategories = sanitizeServiceCategories(body.serviceCategories);
  const organizationTypes = sanitizeOrganizationTypes(body.organizationTypes);

  if (!serviceCategories && !organizationTypes) {
    return NextResponse.json({ error: "No valid catalog changes provided" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (serviceCategories) data.serviceCategories = serviceCategories;
  if (organizationTypes) data.organizationTypes = organizationTypes;

  try {
    await prisma.systemSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        serviceCategories: serviceCategories ?? [...SERVICE_CATEGORIES],
        organizationTypes: organizationTypes ?? [...ORGANIZATION_TYPES],
      },
      update: data,
    });
  } catch (error) {
    console.error("Failed to save catalog settings", error);
    return NextResponse.json(
      {
        error:
          "Failed to save catalog settings. The database schema or Prisma client may be out of date. Apply the latest migration and regenerate Prisma.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    serviceCategories: serviceCategories ?? (await getServiceCategories()),
    organizationTypes: organizationTypes ?? (await getOrganizationTypes()),
  });
}
