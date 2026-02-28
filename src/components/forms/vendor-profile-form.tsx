"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  };
}

export default function VendorProfileForm({ vendor }: VendorProfileFormProps) {
  const [form, setForm] = useState({
    companyName: vendor.companyName,
    contactName: vendor.contactName,
    phone: vendor.phone,
    address: vendor.address,
    serviceRadiusKm: String(vendor.serviceRadiusKm),
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccessMsg("");
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSuccessMsg("Profile updated successfully.");
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
