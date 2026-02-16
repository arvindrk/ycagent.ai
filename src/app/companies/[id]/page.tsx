import { getCompany } from '@/lib/api/companies/get-companies';
import { DetailBreadcrumb } from '@/components/companies/detail/detail-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { CompanyDetailLayout } from '@/components/companies/detail/company-detail-layout';
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

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const company = await getCompany(id);
  const researchAccessToken = await createResearchAccessToken();

  return (
    <div className="min-h-screen bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-bg-secondary focus:ring-2 focus:ring-accent rounded-md"
      >
        Skip to main content
      </a>

      <PageHeader showBackLink />

      <div className="container mx-auto px-4 py-8">
        <DetailBreadcrumb companyName={company.name} />

        <main id="main-content" className="space-y-8">
          <CompanyDetailLayout
            company={company}
            researchAccessToken={researchAccessToken}
          />
        </main>
      </div>
    </div>
  );
}
