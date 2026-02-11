import { Suspense } from 'react';
import { getCompanies } from '@/lib/api/companies/get-companies';
import { CompaniesGrid } from '@/components/companies/companies-grid';
import { CompaniesLoading } from '@/components/companies/companies-loading';
import { CompaniesPagination } from '@/components/companies/companies-pagination';
import { SearchWrapper } from '@/components/search/search-wrapper';
import { PageHeader } from '@/components/layout/page-header';

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
      <PageHeader
        title="YC Companies"
        description="Discover companies from Y Combinator's portfolio"
        stats={`${total.toLocaleString()} companies`}
      />

      <main className="container mx-auto px-4 py-8">
        <SearchWrapper>
          <Suspense fallback={<CompaniesLoading />}>
            <CompaniesGrid companies={companies} />
          </Suspense>

          <CompaniesPagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={limit}
          />
        </SearchWrapper>
      </main>
    </div>
  );
}
