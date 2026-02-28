"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/lib/constants";
import { ImagePlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  address: string | null;
}

interface NewRequestFormProps {
  properties: Property[];
}

export function NewRequestForm({ properties }: NewRequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    propertyId: "",
    description: "",
    category: "",
    urgency: "MEDIUM",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: form.propertyId,
          description: form.description,
          category: form.category || undefined,
          urgency: form.urgency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit request.");
        return;
      }

      const created = await res.json();
      router.push(`/operator/requests/${created.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const propertyOptions = properties.map((p) => ({
    value: p.id,
    label: p.address ? `${p.name} — ${p.address}` : p.name,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/operator/requests"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">New Service Request</h1>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Property */}
            {properties.length === 0 ? (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                No properties found for your organization. Please contact your administrator.
              </div>
            ) : (
              <Select
                label="Property"
                options={propertyOptions}
                placeholder="Select a property..."
                value={form.propertyId}
                onChange={(e) => handleChange("propertyId", e.target.value)}
                required
              />
            )}

            {/* Description */}
            <Textarea
              label="Description"
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={5}
              required
            />

            {/* Category + Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category"
                options={SERVICE_CATEGORIES.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
                placeholder="Select category..."
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
              />
              <Select
                label="Urgency"
                options={URGENCY_LEVELS.map((u) => ({
                  value: u.value,
                  label: u.label,
                }))}
                value={form.urgency}
                onChange={(e) => handleChange("urgency", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo upload */}
        <Card>
          <CardHeader>
            <CardTitle>Photos (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <ImagePlus className="w-10 h-10 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drag &amp; drop photos here
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or{" "}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                      browse files
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const selected = Array.from(e.target.files ?? []);
                          setFiles((prev) => [...prev, ...selected]);
                        }}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, HEIC up to 10MB each</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, i) => (
                  <div key={i} className="relative group">
                    <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Link href="/operator/requests" className="sm:flex-none">
            <Button type="button" variant="secondary" className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={properties.length === 0}
            className="w-full sm:w-auto justify-center"
          >
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
