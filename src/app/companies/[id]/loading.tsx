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
              <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] lg:grid-cols-[120px_1fr_240px] gap-6">
                <Skeleton className="w-[120px] h-[120px] rounded-lg flex-shrink-0" />

                <div className="flex-1 space-y-4 min-w-0">
                  <div>
                    <Skeleton className="h-12 w-3/4 max-w-md" />
                    <Skeleton className="h-6 w-full max-w-xl mt-2" />
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

                <div className="md:col-span-2 lg:col-span-1 rounded-lg border border-border-primary bg-bg-primary shadow-sm min-h-[300px]">
                  <div className="p-6 space-y-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-[13px] w-16" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-[13px] w-12" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-[13px] w-20" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-[13px] w-18" />
                      </div>
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>
              </div>
              <Skeleton className="h-px w-full" />
            </header>

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
        </main>
      </div>
    </div>
  );
}
