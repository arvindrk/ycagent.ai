'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <PageHeader
        title="YC Companies"
        description="Discover companies from Y Combinator's portfolio"
      />

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md mx-auto">
          <h2 className="text-xl font-medium text-text-primary">
            Something went wrong
          </h2>
          <p className="text-text-secondary text-sm">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button variant="accent" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
