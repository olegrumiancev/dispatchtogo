import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  /** Base path, e.g. "/admin/organizations" */
  basePath: string;
  /** Extra query params to preserve across page changes */
  extraParams?: Record<string, string>;
  /** Total number of items (optional — displays "Showing X–Y of N") */
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

  // Build a window of page numbers around the current page
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3">
      {total != null && rangeStart != null && rangeEnd != null ? (
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-700">{rangeStart}–{rangeEnd}</span> of{" "}
          <span className="font-medium text-gray-700">{total}</span>
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Page <span className="font-medium text-gray-700">{page}</span> of{" "}
          <span className="font-medium text-gray-700">{totalPages}</span>
        </p>
      )}

      <nav className="flex items-center gap-1">
        {/* Prev */}
        {page > 1 ? (
          <Link
            href={buildHref(basePath, page - 1, extraParams)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-300 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </span>
        )}

        {/* Ellipsis before */}
        {start > 1 && (
          <>
            <Link
              href={buildHref(basePath, 1, extraParams)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              1
            </Link>
            {start > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
          </>
        )}

        {/* Page numbers */}
        {pages.map((p) => (
          p === page ? (
            <span
              key={p}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-semibold bg-blue-600 text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(basePath, p, extraParams)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {p}
            </Link>
          )
        ))}

        {/* Ellipsis after */}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-400 text-sm">…</span>}
            <Link
              href={buildHref(basePath, totalPages, extraParams)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {totalPages}
            </Link>
          </>
        )}

        {/* Next */}
        {page < totalPages ? (
          <Link
            href={buildHref(basePath, page + 1, extraParams)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-300 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </nav>
    </div>
  );
}
