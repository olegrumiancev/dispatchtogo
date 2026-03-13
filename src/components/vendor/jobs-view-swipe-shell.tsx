"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import type { VendorJobsView } from "@/components/vendor/jobs-view-toggle";

interface VendorJobsViewSwipeShellProps {
  view: VendorJobsView;
  links: Record<VendorJobsView, string>;
  children: ReactNode;
}

interface VendorJobsViewNavigationContextValue {
  isNavigating: boolean;
  navigate: (nextView: VendorJobsView) => void;
  swipeHandlers: Pick<
    HTMLAttributes<HTMLDivElement>,
    "onTouchStart" | "onTouchEnd" | "onTouchCancel" | "onClickCapture"
  >;
}

const VIEW_ORDER: VendorJobsView[] = ["available", "mine", "completed"];
const MIN_SWIPE_DISTANCE = 64;
const MAX_VERTICAL_DRIFT = 42;
const MOBILE_BREAKPOINT = 640;

const VendorJobsViewNavigationContext =
  createContext<VendorJobsViewNavigationContextValue | null>(null);

function shouldIgnoreSwipeStart(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      "input, select, textarea, option, button, summary, label, [data-swipe-ignore='true']"
    )
  );
}

export function VendorJobsViewSwipeShell({
  view,
  links,
  children,
}: VendorJobsViewSwipeShellProps) {
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

  function navigate(nextView: VendorJobsView) {
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

  const navigationValue = useMemo<VendorJobsViewNavigationContextValue>(
    () => ({
      isNavigating,
      navigate,
      swipeHandlers: {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: () => {
          touchStartRef.current = null;
        },
        onClickCapture: (event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
        },
      },
    }),
    [isNavigating, view]
  );

  return (
    <VendorJobsViewNavigationContext.Provider value={navigationValue}>
      <div>
        {isNavigating && (
          <div className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:top-6">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Switching tab...
          </div>
        )}
        {children}
      </div>
    </VendorJobsViewNavigationContext.Provider>
  );
}

export function useVendorJobsViewNavigation() {
  return useContext(VendorJobsViewNavigationContext);
}
