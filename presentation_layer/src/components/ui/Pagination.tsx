import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
  showInfo?: boolean;
}

/**
 * Generate pagination page sequence with ellipsis:
 * E.g., for totalPages = 10, currentPage = 1: [1, 2, 3, 4, 5, '...', 10]
 * E.g., for totalPages = 10, currentPage = 5: [1, '...', 4, 5, 6, '...', 10]
 * E.g., for totalPages = 10, currentPage = 9: [1, '...', 6, 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize = 10,
  onPageChange,
  itemLabel = 'records',
  className = '',
  showInfo = true,
}) => {
  if (totalPages <= 1 && (!totalCount || totalCount <= pageSize)) {
    return null;
  }

  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pages = getPageNumbers(safePage, totalPages);

  const startItem = totalCount !== undefined ? (safePage - 1) * pageSize + 1 : undefined;
  const endItem = totalCount !== undefined ? Math.min(safePage * pageSize, totalCount) : undefined;

  return (
    <div className={`pagination ${className}`.trim()}>
      {showInfo && totalCount !== undefined && (
        <div className="info">
          Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalCount}</strong> {itemLabel}
        </div>
      )}
      <div className="pages">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} className="shrink-0" />
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="ellipsis" aria-hidden="true">
                …
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = pageNum === safePage;
          return (
            <button
              key={pageNum}
              type="button"
              className={isActive ? 'active' : ''}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={16} className="shrink-0" />
        </button>
      </div>
    </div>
  );
};
