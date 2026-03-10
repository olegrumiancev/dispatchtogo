"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  CheckCircle,
  XCircle,
  Ban,
  Power,
  Trash2,
  MoreVertical,
} from "lucide-react";

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail: string;
  isApproved: boolean;
  isRejected: boolean;
  isDisabled: boolean;
  isPending: boolean;
  isAdmin: boolean;
}

export function UserActions({
  userId,
  userName,
  userEmail,
  isApproved,
  isRejected,
  isDisabled,
  isPending,
  isAdmin,
}: UserActionsProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    origin: "top" | "bottom";
    ready: boolean;
  } | null>(null);

  const displayName = userName || userEmail;

  // Admin accounts cannot be managed
  if (isAdmin) return null;

  const callApproveApi = async (action: string, body?: Record<string, any>) => {
    return fetch(`/api/admin/users/${userId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
  };

  const callManageApi = async (action: string) => {
    return fetch(`/api/admin/users/${userId}/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  };

  const handleApprove = async () => {
    setLoading("approve");
    setError(null);
    try {
      const res = await callApproveApi("approve");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to approve");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    setError(null);
    try {
      const res = await callApproveApi("reject", {
        rejectionNote: rejectionNote.trim() || undefined,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to reject");
        return;
      }
      setShowRejectModal(false);
      setRejectionNote("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  const handleDisable = async () => {
    setLoading("disable");
    setError(null);
    try {
      const res = await callManageApi("disable");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to disable");
        return;
      }
      setShowDisableModal(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  const handleEnable = async () => {
    setLoading("enable");
    setError(null);
    try {
      const res = await callManageApi("enable");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to enable");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    setError(null);
    try {
      const res = await callManageApi("delete");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete");
        return;
      }
      setShowDeleteModal(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (!showMenu) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current || !menuRef.current) return;

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuWidth = menuRef.current.offsetWidth;
      const menuHeight = menuRef.current.offsetHeight;
      const viewportPadding = 8;
      const gap = 8;

      let left = buttonRect.right - menuWidth;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

      const openUp =
        buttonRect.bottom + gap + menuHeight > window.innerHeight - viewportPadding &&
        buttonRect.top - gap - menuHeight >= viewportPadding;

      let top = openUp ? buttonRect.top - menuHeight - gap : buttonRect.bottom + gap;
      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - menuHeight - viewportPadding));

      setMenuPosition({
        top,
        left,
        origin: openUp ? "bottom" : "top",
        ready: true,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [showMenu]);

  // ── Pending approval state: prominent Approve / Reject buttons ──
  if (isPending) {
    return (
      <>
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="primary"
            size="sm"
            loading={loading === "approve"}
            onClick={handleApprove}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowRejectModal(true)}
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </Button>
        </div>
        {error && <p className="text-xs text-red-600 text-right mt-1">{error}</p>}

        {/* Reject Modal */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => { setShowRejectModal(false); setRejectionNote(""); setError(null); }}
          title="Reject Registration"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Reject the registration for <strong>{displayName}</strong>? They will not be able to log in.
            </p>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Could not verify business identity..."
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectionNote(""); setError(null); }} className="w-full sm:w-auto justify-center">
                Cancel
              </Button>
              <Button variant="danger" loading={loading === "reject"} onClick={handleReject} className="w-full sm:w-auto justify-center">
                Reject Registration
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ── All other states: dropdown-style menu ──
  return (
    <>
      <div className="inline-block text-left">
        <button
          ref={buttonRef}
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          title="Actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop to close menu */}
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />

            <div
              ref={menuRef}
              className={`fixed z-30 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
                menuPosition?.origin === "bottom" ? "origin-bottom-right" : "origin-top-right"
              }`}
              style={{
                top: menuPosition?.top ?? 0,
                left: menuPosition?.left ?? 0,
                visibility: menuPosition?.ready ? "visible" : "hidden",
              }}
            >
              {/* Re-approve (for rejected users) */}
              {isRejected && (
                <button
                  onClick={() => { setShowMenu(false); handleApprove(); }}
                  disabled={loading === "approve"}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Re-approve
                </button>
              )}

              {/* Disable (only for active, approved users) */}
              {isApproved && !isDisabled && (
                <button
                  onClick={() => { setShowMenu(false); setShowDisableModal(true); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                  Disable
                </button>
              )}

              {/* Enable (only for disabled users) */}
              {isDisabled && (
                <button
                  onClick={() => { setShowMenu(false); handleEnable(); }}
                  disabled={loading === "enable"}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Power className="w-3.5 h-3.5 text-emerald-600" />
                  Re-enable
                </button>
              )}

              {/* Separator */}
              <div className="border-t border-gray-100 my-1" />

              {/* Delete */}
              <button
                onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-600 text-right mt-1">{error}</p>}

      {/* Disable Confirmation Modal */}
      <Modal
        isOpen={showDisableModal}
        onClose={() => { setShowDisableModal(false); setError(null); }}
        title="Disable User"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Disable <strong>{displayName}</strong>? They will not be able to log in until re-enabled. Their data will be preserved.
          </p>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowDisableModal(false); setError(null); }} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button variant="danger" loading={loading === "disable"} onClick={handleDisable} className="w-full sm:w-auto justify-center">
              <Ban className="w-4 h-4" />
              Disable User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setError(null); }}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Permanently delete <strong>{displayName}</strong>? This action cannot be undone. All associated data (notes, messages, notifications) will be removed.
          </p>
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            This is irreversible. Consider disabling the account instead if you may need the user data later.
          </div>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setError(null); }} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button variant="danger" loading={loading === "delete"} onClick={handleDelete} className="w-full sm:w-auto justify-center">
              <Trash2 className="w-4 h-4" />
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
