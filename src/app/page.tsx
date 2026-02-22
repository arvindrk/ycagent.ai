import { Suspense } from 'react';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getCompanies } from '@/lib/api/companies/get-companies';
import { CompanyListGrid } from '@/components/companies/list/company-list-grid';
import { CompanyListSkeleton } from '@/components/companies/list/company-list-skeleton';
import { CompanyListPagination } from '@/components/companies/list/company-list-pagination';
import { SearchWrapper } from '@/components/companies/semantic-search/search-wrapper';
import { PageHeader } from '@/components/layout/page-header';
import { generateHomeMetadata } from '@/lib/seo/metadata';
import { captureServerEvent } from '@/lib/analytics/posthog';
import { getDistinctId, getIpAddress } from '@/lib/analytics/get-distinct-id';
import { getSession } from '@/lib/session';

interface SearchParams {
  page?: string;
}

interface HomePageProps {
  searchParams: Promise<SearchParams>;
}

export const metadata = generateHomeMetadata();

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = 24;

  const { data: companies, total } = await getCompanies({ page, limit });
  const totalPages = Math.ceil(total / limit);

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const session = await getSession(headerStore);
  const ip = getIpAddress(headerStore);
  const distinctId = session?.user.id ?? getDistinctId(cookieStore, ip);

  after(() => {
    captureServerEvent(distinctId, 'listing_page_viewed', {
      page,
      total_companies: total,
      is_authenticated: !!session,
    });
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="YC Companies"
        subtitle="Discover companies from Y Combinator's portfolio"
        metadata={`${total.toLocaleString()} companies`}
      />

      <main className="container mx-auto px-4 py-8">
        <SearchWrapper>
          <Suspense fallback={<CompanyListSkeleton />}>
            <CompanyListGrid companies={companies} />
          </Suspense>

          <CompanyListPagination
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
