"use client";

import { useEffect } from "react";

export function MarkViewed({ requestId }: { requestId: string }) {
  useEffect(() => {
    fetch(`/api/requests/${requestId}/view`, { method: "POST" }).catch(() => {
      // silently ignore — non-critical optimistic tracking
    });
  }, [requestId]);

  return null;
}
