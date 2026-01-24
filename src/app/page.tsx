import { Suspense } from 'react';
import { getCompanies } from '@/lib/api/companies/get-companies';
import { CompaniesGrid } from '@/components/companies/companies-grid';
import { CompaniesLoading } from '@/components/companies/companies-loading';
import { CompaniesPagination } from '@/components/companies/companies-pagination';
import { ThemeToggle } from '@/components/theme-toggle';

interface SearchParams {
  page?: string;
}

interface HomePageProps {
  searchParams: Promise<SearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 24;

  const { data: companies, total } = await getCompanies({ page, limit });
  const totalPages = Math.ceil(total / limit);

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
            <div className="flex items-center gap-6">
              <div className="text-sm text-muted-foreground">
                {total.toLocaleString()} companies
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<CompaniesLoading />}>
          <CompaniesGrid companies={companies} />
        </Suspense>

        <CompaniesPagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={total}
          pageSize={limit}
        />
      </main>
    </div>
  );
}
