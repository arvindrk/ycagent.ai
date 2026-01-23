import { Suspense } from 'react';
import { getCompanies } from '@/lib/api/companies/get-companies';
import { CompaniesGrid } from '@/components/companies/companies-grid';
import { CompaniesLoading } from '@/components/companies/companies-loading';

export default async function HomePage() {
  const { data: companies, total } = await getCompanies({ limit: 24 });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                YC Companies
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover companies from Y Combinator&apos;s portfolio
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {total.toLocaleString()} companies
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<CompaniesLoading />}>
          <CompaniesGrid companies={companies} />
        </Suspense>
      </main>
    </div>
  );
}
