import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-64 mb-6" />
        
        <div className="space-y-8">
          <div className="flex gap-6">
            <Skeleton className="w-[120px] h-[120px] rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          
          <Skeleton className="h-48" />
          
          <Skeleton className="h-32" />
          
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
