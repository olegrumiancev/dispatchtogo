"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Credential {
  id: string;
  type: string;
  credentialNumber: string;
  expiresAt: string | null;
  verified: boolean;
  verifiedAt: string | null;
  documentUrl: string | null;
}

interface AdminCredentialVerifyButtonProps {
  vendorId: string;
  credential: Credential;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

function wsibLookupUrl(accountNumber: string) {
  return `https://www.wsib.ca/en/clearance-certificate?accountNumber=${encodeURIComponent(accountNumber)}`;
}

export function AdminCredentialVerifyButton({
  vendorId,
  credential,
}: AdminCredentialVerifyButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/vendors/${vendorId}/credentials/${credential.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified: !credential.verified }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update.");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* WSIB external lookup shortcut */}
      {credential.type === "WSIB" && credential.credentialNumber && (
        <a
          href={wsibLookupUrl(credential.credentialNumber)}
          target="_blank"
          rel="noopener noreferrer"
          title="Look up on WSIB website"
          className="text-blue-500 hover:text-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}

      {credential.verified ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
            <CheckCircle className="w-4 h-4" />
            Verified
            {credential.verifiedAt && (
              <span className="text-gray-400 font-normal ml-1">
                {formatDate(credential.verifiedAt)}
              </span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            loading={loading}
            className="text-gray-400 hover:text-red-600 text-xs"
            title="Revoke verification"
          >
            Revoke
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={toggle}
          loading={loading}
          className="text-xs"
          title="Mark as verified"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          Verify
        </Button>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
