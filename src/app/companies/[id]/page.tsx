import { Suspense } from 'react';
import { getCompany } from '@/lib/api/companies/get-companies';
import { DetailBreadcrumb } from '@/components/companies/detail/detail-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CompanyDetailLayout } from '@/components/companies/detail/company-detail-layout';
import { CompanyDetailSkeleton } from '@/components/companies/detail/company-detail-skeleton';
import { createResearchAccessToken } from '@/app/actions/research';
import { generateCompanyMetadata } from '@/lib/seo/metadata';

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

  return (
    <div className="min-h-screen bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-bg-secondary focus:ring-2 focus:ring-accent rounded-md"
      >
        Skip to main content
      </a>

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
