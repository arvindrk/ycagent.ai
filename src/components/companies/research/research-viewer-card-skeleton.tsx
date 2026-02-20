import { Skeleton } from '@/components/ui/skeleton';
import { ResearchViewerSkeleton } from './research-viewer-skeleton';

export function ResearchViewerCardSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6" role="status" aria-label="Initializing research environment">
      <div className="lg:w-[60%] flex flex-col h-[600px] rounded-md">
        <div className="py-2 flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>

        <div className="flex-1 overflow-hidden">
          <ResearchViewerSkeleton />
        </div>
      </div>

      <div className="lg:w-[40%]">
        <div className="relative w-full" style={{ paddingBottom: '75%' }}>
          <Skeleton className="absolute top-0 left-0 w-full h-full rounded-md" />
        </div>
        <Skeleton className="h-3 w-3/4 mt-3" />
      </div>
    </div>
  );
}
