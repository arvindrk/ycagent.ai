import { Suspense } from 'react';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getCompany } from '@/lib/api/companies/get-companies';
import { DetailBreadcrumb } from '@/components/companies/detail/detail-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CompanyDetailLayout } from '@/components/companies/detail/company-detail-layout';
import { CompanyDetailSkeleton } from '@/components/companies/detail/company-detail-skeleton';
import { createResearchAccessToken } from '@/app/actions/research';
import { generateCompanyMetadata } from '@/lib/seo/metadata';
import { captureServerEvent } from '@/lib/analytics/posthog';
import { getDistinctId, getIpAddress } from '@/lib/analytics/get-distinct-id';
import { getSession } from '@/lib/session';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const company = await getCompany(id);
  return generateCompanyMetadata(company, `/companies/${id}`);
}

async function CompanyDetailContent({ id }: { id: string }) {
  const company = await getCompany(id);
  const researchAccessToken = await createResearchAccessToken();

  return (
    <>
      <DetailBreadcrumb companyName={company.name} />
      <main id="main-content" className="space-y-8">
        <CompanyDetailLayout
          company={company}
          researchAccessToken={researchAccessToken}
        />
      </main>
    </>
  );
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const session = await getSession(headerStore);
  const ip = getIpAddress(headerStore);
  const distinctId = session?.user.id ?? getDistinctId(cookieStore, ip);

  after(() => {
    captureServerEvent(distinctId, 'company_page_viewed', {
      company_id: id,
      is_authenticated: !!session,
    });
  });

  return (
    <div className="min-h-screen bg-bg-primary">
      <PageHeader
        title="Deep Research Agent"
        subtitle="AI-powered research using live browser automation, web crawling, and synthesis"
        showBackLink
      />

      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<CompanyDetailSkeleton />}>
          <CompanyDetailContent id={id} />
        </Suspense>
      </div>
    </div>
  );
}
