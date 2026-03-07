"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Save, Loader2 } from "lucide-react";

interface VendorProfileFormProps {
  vendor: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    serviceRadiusKm: number;
    categories: string[];
    multipleTeams: boolean;
  };
  onSaved?: () => void;
}

export default function VendorProfileForm({ vendor, onSaved }: VendorProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: vendor.companyName,
    contactName: vendor.contactName,
    phone: vendor.phone,
    address: vendor.address,
    serviceRadiusKm: String(vendor.serviceRadiusKm),
    categories: vendor.categories,
    multipleTeams: vendor.multipleTeams,
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccessMsg("");
    setErrorMsg("");
  }

  function toggleCategory(category: string) {
    setForm((prev) => {
      const exists = prev.categories.includes(category);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category],
      };
    });
    setSuccessMsg("");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.categories.length === 0) {
      setErrorMsg("Please select at least one service category.");
      return;
    }
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName,
          phone: form.phone,
          address: form.address,
          serviceRadiusKm: parseInt(form.serviceRadiusKm, 10) || 50,
          categories: form.categories,
          multipleTeams: form.multipleTeams,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSuccessMsg("Profile updated successfully.");
      onSaved?.();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message ?? "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="companyName">
            Company Name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            value={form.companyName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactName">
            Contact Name
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            value={form.contactName}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="serviceRadiusKm">
            Service Radius (km)
          </label>
          <input
            id="serviceRadiusKm"
            name="serviceRadiusKm"
            type="number"
            min="1"
            max="500"
            value={form.serviceRadiusKm}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="address">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            value={form.address}
            onChange={handleChange}
            className={inputClass}
            placeholder="Street address, city, province..."
          />
        </div>

        <div className="sm:col-span-2">
          <p className={labelClass}>Capacity</p>
          <label className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5 cursor-pointer hover:border-gray-300 transition-colors">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.multipleTeams}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, multipleTeams: e.target.checked }));
                  setSuccessMsg("");
                  setErrorMsg("");
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Multiple teams</p>
              <p className="text-xs text-gray-500">
                {form.multipleTeams
                  ? "You can accept multiple jobs at once. Availability status won\u2019t auto-update."
                  : "Single team \u2014 your availability will automatically switch to Busy when you accept a job, and back to Available when it\u2019s complete."}
              </p>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2">
          <p className={labelClass}>Service Categories</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICE_CATEGORIES.map((category) => {
              const checked = form.categories.includes(category.value);
              return (
                <label
                  key={category.value}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    checked
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category.value)}
                    className="rounded border-gray-300"
                  />
                  <span>{category.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {successMsg && (
        <p className="text-sm text-emerald-600 font-medium">{successMsg}</p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
