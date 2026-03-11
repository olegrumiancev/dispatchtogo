"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useCatalogOptions } from "@/hooks/use-catalog-options";

interface OrgData {
  id: string;
  name: string;
  type: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

interface Props {
  initialOrg: OrgData;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

export default function OperatorOrganizationForm({ initialOrg }: Props) {
  const { organizationTypes } = useCatalogOptions();
  const [form, setForm] = useState({
    name: initialOrg.name,
    type: initialOrg.type,
    contactEmail: initialOrg.contactEmail ?? "",
    contactPhone: initialOrg.contactPhone ?? "",
    address: initialOrg.address ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/operator/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save changes.");
      } else {
        setSuccessMsg("Organization details saved.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900">Organization Details</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Update your organization&apos;s name, contact info, and address.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="org-name">Organization Name</label>
              <input
                id="org-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className={inputClass}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="org-type">Property Type</label>
              <select
                id="org-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                className={inputClass}
                disabled={saving}
              >
                {organizationTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="org-contactEmail">Contact Email</label>
              <input
                id="org-contactEmail"
                name="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={handleChange}
                className={inputClass}
                placeholder="contact@yourorg.com"
                disabled={saving}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="org-contactPhone">Phone Number</label>
              <input
                id="org-contactPhone"
                name="contactPhone"
                type="tel"
                value={form.contactPhone}
                onChange={handleChange}
                className={inputClass}
                placeholder="613-555-0000"
                disabled={saving}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="org-address">Address</label>
            <input
              id="org-address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className={inputClass}
              placeholder="123 Main St, Cornwall, ON K6H 1A1"
              disabled={saving}
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600">{successMsg}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
