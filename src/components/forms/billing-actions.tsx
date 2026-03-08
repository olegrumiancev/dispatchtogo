"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard, ArrowUpCircle, Loader2, CheckCircle2 } from "lucide-react";

interface BillingActionsProps {
  hasPaymentMethod: boolean;
  currentPlan: string;
  isOverLimit: boolean;
  heldRequestsCount: number;
}

export function BillingActions({
  hasPaymentMethod,
  currentPlan,
  isOverLimit,
  heldRequestsCount,
}: BillingActionsProps) {
  const router = useRouter();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const handleAddPaymentMethod = async () => {
    setLoadingCheckout(true);
    try {
      const res = await fetch("/api/stripe/setup-checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error("Failed to create checkout session", data);
        return;
      }
      window.location.href = data.url;
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeError("");
    if (!hasPaymentMethod) {
      // Redirect through payment method first
      await handleAddPaymentMethod();
      return;
    }
    setLoadingUpgrade(true);
    try {
      const res = await fetch("/api/operator/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "VALUE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresPaymentMethod) {
          await handleAddPaymentMethod();
          return;
        }
        setUpgradeError(data.error ?? "Upgrade failed. Please try again.");
        return;
      }
      router.refresh();
    } finally {
      setLoadingUpgrade(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Payment method required gate */}
      {!hasPaymentMethod && isOverLimit && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 space-y-3">
          <div className="flex items-start gap-2">
            <CreditCard className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Free dispatches used — new requests are on hold
              </p>
              <p className="text-sm text-red-700 mt-0.5">
                You&apos;ve used all {heldRequestsCount > 0 ? "your" : "your"} included free
                dispatches.{" "}
                {heldRequestsCount > 0 && (
                  <strong>
                    {heldRequestsCount} request{heldRequestsCount !== 1 ? "s" : ""} are waiting to be dispatched.
                  </strong>
                )}{" "}
                Add a payment method to continue — you only pay for dispatches above the free limit
                at $0.25 CAD each.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            By adding a payment method, you agree to the{" "}
            <a
              href="/terms#billing"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              billing terms
            </a>.
          </p>
          <Button
            onClick={handleAddPaymentMethod}
            disabled={loadingCheckout}
            className="w-full sm:w-auto"
          >
            {loadingCheckout ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Stripe…</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Add Payment Method &amp; Release Requests</>
            )}
          </Button>
        </div>
      )}

      {/* Add payment method without being gated */}
      {!hasPaymentMethod && !isOverLimit && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 space-y-2">
          <p className="text-sm text-blue-800">
            <strong>No payment method on file.</strong> Add one now to ensure requests continue
            dispatching when you reach the free plan limit.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddPaymentMethod}
            disabled={loadingCheckout}
          >
            {loadingCheckout ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
            ) : (
              <><CreditCard className="w-4 h-4 mr-2" /> Add Payment Method</>
            )}
          </Button>
        </div>
      )}

      {/* Payment method confirmed */}
      {hasPaymentMethod && (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          Payment method on file
        </div>
      )}

      {/* Upgrade to Value plan */}
      {currentPlan === "FREE" && (
        <div className="pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpgrade}
            disabled={loadingUpgrade || loadingCheckout}
          >
            {loadingUpgrade ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upgrading…</>
            ) : (
              <><ArrowUpCircle className="w-4 h-4 mr-2" /> Upgrade to Value Plan (100 included/month)</>
            )}
          </Button>
          {upgradeError && (
            <p className="text-xs text-red-600 mt-1">{upgradeError}</p>
          )}
        </div>
      )}
    </div>
  );
}
