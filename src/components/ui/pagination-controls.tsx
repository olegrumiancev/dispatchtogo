import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  /** Base path, e.g. "/admin/organizations" */
  basePath: string;
  /** Extra query params to preserve across page changes */
  extraParams?: Record<string, string>;
  /** Total number of items (optional - displays "Showing X-Y of N") */
  total?: number;
  pageSize?: number;
}

function buildHref(
  basePath: string,
  targetPage: number,
  extraParams?: Record<string, string>
) {
  const params = new URLSearchParams({ ...extraParams, page: String(targetPage) });
  return `${basePath}?${params.toString()}`;
}

export function PaginationControls({
  page,
  totalPages,
  basePath,
  extraParams,
  total,
  pageSize,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const rangeStart = total && pageSize ? (page - 1) * pageSize + 1 : null;
  const rangeEnd = total && pageSize ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 sm:flex-row">
      {total != null && rangeStart != null && rangeEnd != null ? (
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-700">{rangeStart}-{rangeEnd}</span> of{" "}
          <span className="font-medium text-slate-700">{total}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Page <span className="font-medium text-slate-700">{page}</span> of{" "}
          <span className="font-medium text-slate-700">{totalPages}</span>
        </p>
      )}

      <nav className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(basePath, page - 1, extraParams)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-brand-mist"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-300">
            <ChevronLeft className="w-4 h-4" />
          </span>
        )}

        {start > 1 && (
          <>
            <Link
              href={buildHref(basePath, 1, extraParams)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-700 transition-colors hover:bg-brand-mist"
            >
              1
            </Link>
            {start > 2 && <span className="px-1 text-sm text-slate-400">...</span>}
          </>
        )}

        {pages.map((p) =>
          p === page ? (
            <span
              key={p}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary text-sm font-semibold text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(basePath, p, extraParams)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-700 transition-colors hover:bg-brand-mist"
            >
              {p}
            </Link>
          )
        )}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-sm text-slate-400">...</span>}
            <Link
              href={buildHref(basePath, totalPages, extraParams)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm text-slate-700 transition-colors hover:bg-brand-mist"
            >
              {totalPages}
            </Link>
          </>
        )}

        {page < totalPages ? (
          <Link
            href={buildHref(basePath, page + 1, extraParams)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-brand-mist"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-md text-slate-300">
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
