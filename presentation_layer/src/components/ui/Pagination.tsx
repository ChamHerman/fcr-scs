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
  showPageJump?: boolean;
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
  showPageJump = true,
}) => {
  const [jumpInput, setJumpInput] = React.useState('');
  const [jumpError, setJumpError] = React.useState(false);

  if (totalPages <= 1 && (!totalCount || totalCount <= pageSize)) {
    return null;
  }

  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const pages = getPageNumbers(safePage, totalPages);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setJumpError(false);
      onPageChange(pageNum);
      setJumpInput('');
    } else {
      setJumpError(true);
    }
  };

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

      {showPageJump && totalPages > 1 && (
        <form onSubmit={handleJump} className="jump-to-page flex items-center gap-2 ml-4 text-sm text-md-on-surface-variant relative">
          <span>Go to page:</span>
          <input 
            type="text" 
            value={jumpInput}
            onChange={(e) => { setJumpInput(e.target.value.replace(/\D/g, '')); setJumpError(false); }}
            placeholder={safePage.toString()}
            className={`w-12 h-8 px-2 py-1 text-center bg-md-surface-container border rounded-lg text-md-on-surface outline-none focus:ring-1 ${jumpError ? 'border-md-error focus:ring-md-error' : 'border-md-outline/30 focus:border-md-primary focus:ring-md-primary'}`}
          />
          <span>of {totalPages}</span>
          <button type="submit" className="hidden">Go</button>
          {jumpError && (
            <span className="absolute -bottom-5 left-0 w-max text-xs text-md-error">
              Invalid page range
            </span>
          )}
        </form>
      )}
    </div>
  );
};
