import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_COUNT = 5;

export function ResearchViewerSkeleton() {
  return (
    <div className="relative" role="status" aria-label="Loading timeline">
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 border-l-2 border-border-secondary" />
      <div className="space-y-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="relative flex">
            <div className="absolute left-0 top-2.5 flex items-center justify-center w-5 h-5">
              <Skeleton className="w-3 h-3 rounded-full" />
            </div>
            <div className="ml-8 flex-1 min-w-0 max-w-[90%]">
              <div className="rounded-lg px-4 py-3 bg-white dark:bg-bg-quaternary shadow-sm">
                <div className="flex gap-3 items-start">
                  <Skeleton className="w-4 h-4 flex-shrink-0 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className={`h-4 ${i === 0 ? 'w-48' : i === 1 ? 'w-40' : 'w-56'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
