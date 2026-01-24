'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CompaniesPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export function CompaniesPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
}: CompaniesPaginationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const handlePageChange = (page: number) => {
    startTransition(() => {
      if (page === 1) {
        router.push('/');
      } else {
        router.push(`/?page=${page}`);
      }
    });
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (currentPage <= 3) {
      for (let i = 2; i <= Math.min(4, totalPages - 1); i++) {
        pages.push(i);
      }
      if (totalPages > 5) pages.push('ellipsis');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push('ellipsis');
      for (let i = Math.max(totalPages - 3, 2); i < totalPages; i++) {
        pages.push(i);
      }
      pages.push(totalPages);
    } else {
      pages.push('ellipsis');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="mt-8 space-y-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1 && !isPending) {
                  handlePageChange(currentPage - 1);
                }
              }}
              aria-disabled={currentPage === 1 || isPending}
              className={
                currentPage === 1 || isPending
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
            />
          </PaginationItem>

          {pages.map((page, index) => (
            <PaginationItem key={index}>
              {page === 'ellipsis' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page !== currentPage && !isPending) {
                      handlePageChange(page);
                    }
                  }}
                  isActive={page === currentPage}
                  aria-disabled={isPending}
                  className={isPending ? 'pointer-events-none' : ''}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages && !isPending) {
                  handlePageChange(currentPage + 1);
                }
              }}
              aria-disabled={currentPage === totalPages || isPending}
              className={
                currentPage === totalPages || isPending
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <div className="flex justify-center">
        <p className="text-sm text-text-secondary">
          Showing {startItem.toLocaleString()}-{endItem.toLocaleString()} of{' '}
          {totalCount.toLocaleString()} companies
        </p>
      </div>
    </div>
  );
}
