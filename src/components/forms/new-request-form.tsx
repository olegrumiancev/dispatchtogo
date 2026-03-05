"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SERVICE_CATEGORIES, URGENCY_LEVELS } from "@/lib/constants";
import { createServiceRequestAction } from "@/lib/actions";
import { X, ImagePlus, Loader2 } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string | null;
}

interface NewRequestFormProps {
  properties: Property[];
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function NewRequestForm({ properties }: NewRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
      if (oversized.length) {
        setError(`Some files exceed 10 MB: ${oversized.map((f) => f.name).join(", ")}`);
        e.target.value = "";
        return;
      }

      const combined = [...photos, ...files].slice(0, MAX_FILES);
      setPhotos(combined);
      setPreviews(combined.map((f) => URL.createObjectURL(f)));
      setError(null);
      e.target.value = "";
    },
    [photos]
  );

  const removePhoto = useCallback(
    (index: number) => {
      const updated = photos.filter((_, i) => i !== index);
      setPhotos(updated);
      setPreviews(updated.map((f) => URL.createObjectURL(f)));
    },
    [photos]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!propertyId) {
      setFieldErrors((prev) => ({ ...prev, propertyId: "Please select a property." }));
      return;
    }
    if (!category) {
      setFieldErrors((prev) => ({ ...prev, category: "Please select a category." }));
      return;
    }
    if (!description.trim()) {
      setFieldErrors((prev) => ({ ...prev, description: "Please describe the issue." }));
      return;
    }

    const formData = new FormData();
    formData.append("propertyId", propertyId);
    formData.append("category", category);
    formData.append("urgency", urgency);
    formData.append("description", description);
    photos.forEach((file) => formData.append("photos", file));

    startTransition(async () => {
      try {
        const result = await createServiceRequestAction(formData);
        if (result?.error) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          } else {
            setError(result.error);
          }
          return;
        }
        router.push("/app/operator/requests");
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Service Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Select
            label="Property"
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select a property…"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            required
            error={fieldErrors.propertyId}
          />

          <Select
            label="Service Category"
            options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="Select category…"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            error={fieldErrors.category}
          />

          <Select
            label="Urgency"
            options={URGENCY_LEVELS.map((u) => ({ value: u.value, label: u.label }))}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
          />

          <Textarea
            label="Description"
            placeholder="Describe the issue in detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
            error={fieldErrors.description}
          />

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Photos{" "}
              <span className="text-gray-400 font-normal">(optional, up to 5)</span>
            </label>

            {/* Preview grid */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-0.5 hover:bg-opacity-100 transition"
                    >
                      <X className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-dashed border-blue-300 rounded-lg px-4 py-2.5 hover:bg-blue-50 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                {photos.length === 0 ? "Add photos" : "Add more"}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              loading={isPending}
            >
              {isPending ? "Submitting…" : "Submit Request"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
