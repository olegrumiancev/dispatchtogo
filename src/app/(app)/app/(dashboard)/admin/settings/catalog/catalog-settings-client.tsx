"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OrganizationTypeOption, ServiceCategoryOption } from "@/lib/constants";
import { AlertCircle, Plus, Save, Shapes, Trash2 } from "lucide-react";

type CatalogResponse = {
  serviceCategories: ServiceCategoryOption[];
  organizationTypes: OrganizationTypeOption[];
};

const EMPTY_CATEGORY: ServiceCategoryOption = {
  value: "",
  label: "",
  requiresLicense: false,
};

const EMPTY_ORG_TYPE: OrganizationTypeOption = {
  value: "",
  label: "",
};

type CatalogSettingsClientProps = {
  embedded?: boolean;
};

export function CatalogSettingsClient({ embedded = false }: CatalogSettingsClientProps) {
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryOption[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/catalog", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CatalogResponse | null) => {
        if (!data) {
          setError("Failed to load catalog settings.");
          return;
        }
        setServiceCategories(data.serviceCategories);
        setOrganizationTypes(data.organizationTypes);
      })
      .catch(() => setError("Failed to load catalog settings."))
      .finally(() => setLoading(false));
  }, []);

  const updateCategory = (
    index: number,
    field: keyof ServiceCategoryOption,
    value: string | boolean
  ) => {
    setServiceCategories((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const updateOrgType = (
    index: number,
    field: keyof OrganizationTypeOption,
    value: string
  ) => {
    setOrganizationTypes((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceCategories,
          organizationTypes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save catalog settings.");
        return;
      }

      setServiceCategories(data.serviceCategories ?? serviceCategories);
      setOrganizationTypes(data.organizationTypes ?? organizationTypes);
      setSuccess("Catalog settings saved.");
    } catch {
      setError("Failed to save catalog settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading catalog settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`flex items-center gap-2 font-bold text-gray-900 ${embedded ? "text-lg" : "text-2xl"}`}>
            <Shapes className="h-6 w-6 text-blue-600" />
            {embedded ? "Catalog" : "Catalog Management"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage service request categories and organization types without a code deploy.
          </p>
        </div>
        <Button variant="primary" onClick={save} loading={saving} className="justify-center">
          <Save className="h-4 w-4" />
          Save Catalog
        </Button>
      </div>

      {(error || success) && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            error
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ? <AlertCircle className="h-4 w-4" /> : null}
          {error ?? success}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Service Categories</h2>
          <p className="mt-1 text-sm text-slate-500">
            These drive vendor skills, request classification, filters, and dispatch matching.
          </p>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div className="hidden rounded-lg bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1.6fr_auto_auto] md:items-center md:gap-3">
            <span>Key</span>
            <span>Label</span>
            <span>License</span>
            <span>Actions</span>
          </div>
          {serviceCategories.map((category, index) => (
            <div key={`${category.value || "new"}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1.2fr_1.6fr_auto_auto] md:items-center">
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">Key</span>
                <input
                  value={category.value}
                  onChange={(e) => updateCategory(index, "value", e.target.value.toUpperCase())
                  }
                  placeholder="KEY"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">Label</span>
                <input
                  value={category.label}
                  onChange={(e) => updateCategory(index, "label", e.target.value)}
                  placeholder="Label"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">License</span>
                <span className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={category.requiresLicense}
                    onChange={(e) => updateCategory(index, "requiresLicense", e.target.checked)}
                  />
                  Licensed
                </span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setServiceCategories((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                }
                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setServiceCategories((prev) => [...prev, { ...EMPTY_CATEGORY }])}
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Organization Types</h2>
          <p className="mt-1 text-sm text-slate-500">
            These appear during operator onboarding and in admin organization management.
          </p>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div className="hidden rounded-lg bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.2fr_1.6fr_auto] md:items-center md:gap-3">
            <span>Key</span>
            <span>Label</span>
            <span>Actions</span>
          </div>
          {organizationTypes.map((orgType, index) => (
            <div key={`${orgType.value || "new"}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1.2fr_1.6fr_auto] md:items-center">
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">Key</span>
                <input
                  value={orgType.value}
                  onChange={(e) => updateOrgType(index, "value", e.target.value.toUpperCase())}
                  placeholder="KEY"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <label className="space-y-1 md:space-y-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">Label</span>
                <input
                  value={orgType.label}
                  onChange={(e) => updateOrgType(index, "label", e.target.value)}
                  placeholder="Label"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setOrganizationTypes((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
                }
                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOrganizationTypes((prev) => [...prev, { ...EMPTY_ORG_TYPE }])}
          >
            <Plus className="h-4 w-4" />
            Add Organization Type
          </Button>
        </div>
      </section>
    </div>
  );
}
