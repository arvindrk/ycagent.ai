import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-primary">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-end">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-5 w-80 mb-6" />
        
        <main className="space-y-8">
          <article className="space-y-8">
            <header className="space-y-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <Skeleton className="w-[120px] h-[120px] rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-4 min-w-0 w-full">
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-3/4 max-w-md" />
                    <Skeleton className="h-6 w-full max-w-xl" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
            </header>
            
            <section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            </section>
            
            <section>
              <Skeleton className="h-48 rounded-lg" />
            </section>
            
            <section className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-16" />
              </div>
            </section>
          </article>
          
          <section className="space-y-6">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </section>
        </main>
      </div>
    </div>
  );
}
