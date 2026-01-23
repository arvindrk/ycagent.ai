'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  hasMore: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
  currentPage: number;
  totalCount?: number;
  pageSize: number;
}

export function Pagination({
  hasMore,
  hasPrevious,
  onNext,
  onPrevious,
  isLoading = false,
  currentPage,
  totalCount,
  pageSize,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount || 0);

  return (
    <div className="flex items-center justify-between border-t pt-6">
      <div className="text-sm text-muted-foreground">
        {totalCount !== undefined && (
          <span>
            Showing {startItem}-{endItem} of {totalCount} companies
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious || isLoading}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1 px-3 text-sm">
          Page {currentPage}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore || isLoading}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
