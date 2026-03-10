"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { optimizeImageFileForUpload } from "@/lib/client-image";

interface AddPhotosButtonProps {
  requestId: string;
}

export function AddPhotosButton({ requestId }: AddPhotosButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    const fileArr = Array.from(files);

    try {
      const uploads: Array<{
        url: string;
        fullUrl?: string | null;
        thumbnailUrl?: string | null;
        type: string;
      }> = [];

      for (let i = 0; i < fileArr.length; i++) {
        setProgress(`Uploading ${i + 1} of ${fileArr.length}…`);
        const optimizedFile = await optimizeImageFileForUpload(fileArr[i]);
        const fd = new FormData();
        fd.append("file", optimizedFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          throw new Error(data.error ?? `Failed to upload photo ${i + 1}`);
        }
        const uploaded = await uploadRes.json();
        uploads.push({
          url: uploaded.url,
          fullUrl: uploaded.fullUrl ?? null,
          thumbnailUrl: uploaded.thumbnailUrl ?? null,
          type: "INTAKE",
        });
      }

      setProgress("Saving…");
      const saveRes = await fetch(`/api/requests/${requestId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: uploads }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save photos");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
      // Reset the input so the same files can be re-selected after an error
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium"
      >
        <ImagePlus className="w-4 h-4" />
        {progress ?? "Add Photos"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
