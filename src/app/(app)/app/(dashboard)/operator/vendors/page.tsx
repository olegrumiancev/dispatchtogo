"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Heart, Building2 } from "lucide-react";
import { useCatalogOptions } from "@/hooks/use-catalog-options";

interface Vendor {
  id: string;
  companyName: string;
  skills: { category: string }[];
}

interface Property {
  id: string;
  name: string;
}

interface PreferredVendor {
  id: string;
  category: string;
  propertyId: string | null;
  vendorId: string;
  vendor: { id: string; companyName: string };
  property: { id: string; name: string } | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function PreferredVendorsPage() {
  const { serviceCategories } = useCatalogOptions();
  const [prefs, setPrefs] = useState<PreferredVendor[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-form state
  const [addCategory, setAddCategory] = useState("");
  const [addPropertyId, setAddPropertyId] = useState("");
  const [addVendorId, setAddVendorId] = useState("");
  const [saving, setSaving] = useState(false);
  const getCategoryLabel = (value: string) =>
    serviceCategories.find((c) => norm(c.value) === norm(value))?.label ?? value;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/preferred-vendors");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setPrefs(data.prefs);
      setProperties(data.properties);
      setVendors(data.vendors);
    } catch {
      setError("Failed to load preferred vendors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    if (!addCategory || !addVendorId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/preferred-vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: addCategory,
          propertyId: addPropertyId || null,
          vendorId: addVendorId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      setAddCategory("");
      setAddPropertyId("");
      setAddVendorId("");
      await fetchData();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/preferred-vendors?id=${id}`, { method: "DELETE" });
      setPrefs((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Failed to remove preference.");
    }
  };

  // Filter vendors that have skills matching the selected category
  const filteredVendors = addCategory
    ? vendors.filter((v) =>
        v.skills.some((s) => norm(s.category) === norm(addCategory))
      )
    : vendors;

  // Group prefs: org-level (no property) and property-level
  const orgPrefs = prefs.filter((p) => !p.propertyId);
  const propPrefs = prefs.filter((p) => p.propertyId);

  // Group property prefs by property
  const propGroups: Record<string, { name: string; prefs: PreferredVendor[] }> = {};
  for (const p of propPrefs) {
    const pid = p.propertyId!;
    if (!propGroups[pid]) {
      propGroups[pid] = { name: p.property?.name ?? "Unknown", prefs: [] };
    }
    propGroups[pid].prefs.push(p);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Preferred Vendors</h1>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preferred Vendors</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set default vendors per service category. Property-level preferences
          override organization defaults.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add new preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Preference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Category"
              options={serviceCategories.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              placeholder="Select category…"
              value={addCategory}
              onChange={(e) => {
                setAddCategory(e.target.value);
                setAddVendorId("");
              }}
              required
            />
            <Select
              label="Property (optional)"
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="All properties"
              value={addPropertyId}
              onChange={(e) => setAddPropertyId(e.target.value)}
            />
            <Select
              label="Vendor"
              options={filteredVendors.map((v) => ({
                value: v.id,
                label: v.companyName,
              }))}
              placeholder={
                addCategory
                  ? filteredVendors.length === 0
                    ? "No vendors for this category"
                    : "Select vendor…"
                  : "Choose category first"
              }
              value={addVendorId}
              onChange={(e) => setAddVendorId(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="primary"
                loading={saving}
                disabled={!addCategory || !addVendorId}
                onClick={handleAdd}
                className="w-full justify-center"
              >
                Save Preference
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization-level defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Organization Defaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgPrefs.length === 0 ? (
            <p className="text-sm text-gray-400">
              No organization-level vendor preferences set yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {orgPrefs.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-100 text-purple-800">
                      {getCategoryLabel(p.category)}
                    </Badge>
                    <span className="text-sm text-gray-700">
                      {p.vendor.companyName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property-level overrides */}
      {Object.keys(propGroups).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Property Overrides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(propGroups).map(([pid, group]) => (
              <div key={pid}>
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {group.name}
                </p>
                <div className="divide-y divide-gray-100 pl-4 border-l-2 border-blue-100">
                  {group.prefs.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-purple-100 text-purple-800">
                          {getCategoryLabel(p.category)}
                        </Badge>
                        <span className="text-sm text-gray-700">
                          {p.vendor.companyName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {prefs.length === 0 && (
        <div className="text-center py-12">
          <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            No preferred vendors configured yet.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Add preferences above to auto-assign your trusted vendors to new
            requests.
          </p>
        </div>
      )}
    </div>
  );
}
