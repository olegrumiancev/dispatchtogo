"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import type { RequestsView } from "@/components/operator/requests-view-toggle";

interface RequestsViewSwipeShellProps {
  view: RequestsView;
  links: Record<RequestsView, string>;
  children: ReactNode;
}

interface RequestsViewNavigationContextValue {
  isNavigating: boolean;
  navigate: (nextView: RequestsView) => void;
}

const VIEW_ORDER: RequestsView[] = ["active", "completed", "cancelled"];
const MIN_SWIPE_DISTANCE = 64;
const MAX_VERTICAL_DRIFT = 42;
const MOBILE_BREAKPOINT = 640;
const RequestsViewNavigationContext =
  createContext<RequestsViewNavigationContextValue | null>(null);

function shouldIgnoreSwipeStart(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      "input, select, textarea, option, button, summary, label, [data-swipe-ignore='true']"
    )
  );
}

export function RequestsViewSwipeShell({
  view,
  links,
  children,
}: RequestsViewSwipeShellProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const touchStartRef = useRef<{
    x: number;
    y: number;
    ignore: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const currentIndex = VIEW_ORDER.indexOf(view);

  useEffect(() => {
    Object.values(links).forEach((href) => {
      router.prefetch(href);
    });
  }, [links, router]);

  function navigate(nextView: RequestsView) {
    if (nextView === view) return;

    startNavigation(() => {
      router.push(links[nextView]);
    });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      ignore: shouldIgnoreSwipeStart(event.target),
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!touchStartRef.current) return;

    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (start.ignore || window.innerWidth >= MOBILE_BREAKPOINT) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (
      Math.abs(deltaX) < MIN_SWIPE_DISTANCE ||
      Math.abs(deltaY) > Math.abs(deltaX) ||
      Math.abs(deltaY) > MAX_VERTICAL_DRIFT
    ) {
      return;
    }

    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= VIEW_ORDER.length) return;

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    navigate(VIEW_ORDER[nextIndex]);
  }

  const navigationValue = useMemo<RequestsViewNavigationContextValue>(
    () => ({
      isNavigating,
      navigate,
    }),
    [isNavigating, view, links]
  );

  return (
    <RequestsViewNavigationContext.Provider value={navigationValue}>
      <div
        className="touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
        }}
      >
        {isNavigating && (
          <div className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:top-6">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Switching view...
          </div>
        )}
        {children}
      </div>
    </RequestsViewNavigationContext.Provider>
  );
}

export function useRequestsViewNavigation() {
  return useContext(RequestsViewNavigationContext);
}
