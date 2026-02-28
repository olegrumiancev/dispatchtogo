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
    category: "",
    urgency: "MEDIUM",
    description: "",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return;
    const newFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [
      ...prev,
      ...newFiles.filter(
        (nf) => !prev.some((pf) => pf.name === nf.name && pf.size === nf.size)
      ),
    ]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.propertyId || !form.category || !form.description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create the service request
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create request");
      }

      const { id: requestId } = await res.json();

      // 2. Upload photos if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));

        const uploadRes = await fetch(`/api/requests/${requestId}/photos`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.warn("Photo upload failed, but request was created.");
        }
      }

      router.push("/operator/requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link href="/operator/requests">
              <Button type="button" variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <CardTitle>New Service Request</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Property */}
          <Select
            label="Property *"
            options={properties.map((p) => ({
              value: p.id,
              label: p.address ? `${p.name} – ${p.address}` : p.name,
            }))}
            placeholder="Select a property"
            value={form.propertyId}
            onChange={(e) => handleChange("propertyId", e.target.value)}
          />

          {/* Category */}
          <Select
            label="Service Category *"
            options={SERVICE_CATEGORIES}
            placeholder="Select a category"
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
          />

          {/* Urgency */}
          <Select
            label="Urgency"
            options={URGENCY_LEVELS}
            value={form.urgency}
            onChange={(e) => handleChange("urgency", e.target.value)}
          />

          {/* Description */}
          <Textarea
            label="Description *"
            placeholder="Describe the issue in detail…"
            rows={5}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />

          {/* Photo upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Photos (optional)
            </p>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
            >
              <ImagePlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Drag & drop images or{" "}
                <label className="text-blue-600 cursor-pointer hover:underline">
                  browse
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
              </p>
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                  >
                    <span className="truncate text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Link href="/operator/requests">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            Submit Request
          </Button>
        </div>
      </Card>
    </form>
  );
}
