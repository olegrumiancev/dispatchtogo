"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, X, CheckCircle, XCircle } from "lucide-react";

const CREDENTIAL_TYPES = [
  { value: "TRADE_LICENSE", label: "Trade License" },
  { value: "WSIB", label: "WSIB" },
  { value: "INSURANCE_COI", label: "Insurance / COI" },
  { value: "BUSINESS_LICENSE", label: "Business License" },
  { value: "OTHER", label: "Other" },
] as const;

type CredentialType = (typeof CREDENTIAL_TYPES)[number]["value"];

interface Credential {
  id: string;
  type: string;
  credentialNumber: string;
  expiresAt: string | null;
  verified: boolean;
}

interface VendorCredentialsFormProps {
  vendorId: string;
  credentials: Credential[];
}

function getCredentialTypeLabel(type: string) {
  return CREDENTIAL_TYPES.find((t) => t.value === type)?.label ?? type;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA");
}

export default function VendorCredentialsForm({
  vendorId,
  credentials,
}: VendorCredentialsFormProps) {
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<CredentialType>("TRADE_LICENSE");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!credentialNumber.trim()) {
      setAddError("Credential number is required.");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          credentialNumber: credentialNumber.trim(),
          ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddError(data.error ?? "Failed to add credential.");
        return;
      }

      setCredentialNumber("");
      setExpiresAt("");
      setType("TRADE_LICENSE");
      setShowForm(false);
      router.refresh();
    } catch {
      setAddError("An unexpected error occurred.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(credentialId: string) {
    setDeleteError(null);
    setDeletingId(credentialId);
    try {
      const res = await fetch(`/api/vendors/${vendorId}/credentials`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? "Failed to delete credential.");
        return;
      }

      router.refresh();
    } catch {
      setDeleteError("An unexpected error occurred.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Add credential button */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {credentials.length === 0
            ? "No credentials on file."
            : `${credentials.length} credential${credentials.length === 1 ? "" : "s"} on file.`}
        </span>
        {!showForm && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowForm(true);
              setAddError(null);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </Button>
        )}
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="mx-6 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-800">New Credential</p>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setAddError(null);
                setCredentialNumber("");
                setExpiresAt("");
                setType("TRADE_LICENSE");
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CredentialType)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CREDENTIAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Credential Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={credentialNumber}
                  onChange={(e) => setCredentialNumber(e.target.value)}
                  placeholder="e.g. LIC-12345"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Expiry Date <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {addError && (
              <p className="text-sm text-red-600">{addError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setAddError(null);
                  setCredentialNumber("");
                  setExpiresAt("");
                  setType("TRADE_LICENSE");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={adding}>
                Save Credential
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials table */}
      {credentials.length > 0 ? (
        <div className="overflow-x-auto">
          {deleteError && (
            <p className="px-6 py-2 text-sm text-red-600">{deleteError}</p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Credential Number
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Expiry Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {credentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {getCredentialTypeLabel(cred.type)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">
                    {cred.credentialNumber || (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 hidden lg:table-cell">
                    {cred.expiresAt ? (
                      <span
                        className={
                          new Date(cred.expiresAt) < new Date()
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        {formatDate(cred.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {cred.verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <XCircle className="w-4 h-4" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === cred.id}
                      onClick={() => handleDelete(cred.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete credential"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && (
          <div className="px-6 pb-8 text-center text-sm text-gray-400">
            Use the button above to add your first credential.
          </div>
        )
      )}
    </div>
  );
}
