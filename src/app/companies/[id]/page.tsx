import { Suspense } from 'react';
import { getCompany } from '@/lib/api/companies/get-company';
import { CompanyBreadcrumb } from '@/components/companies/detail/company-breadcrumb';
import { CompanyHeader } from '@/components/companies/detail/company-header';
import { CompanyStats } from '@/components/companies/detail/company-stats';
import { CompanyDescription } from '@/components/companies/detail/company-description';
import { CompanyTags } from '@/components/companies/detail/company-tags';
import { CompanyTabs } from '@/components/companies/detail/company-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const company = await getCompany(id);

  return {
    title: `${company.name} | YC Companies`,
    description:
      company.one_liner ||
      `Explore ${company.name} from Y Combinator's portfolio`,
  };
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const company = await getCompany(id);

  return (
    <div className="min-h-screen bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-bg-secondary focus:ring-2 focus:ring-accent rounded-md"
      >
        Skip to main content
      </a>

      <header className="border-b border-border-primary">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-end">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <CompanyBreadcrumb companyName={company.name} />

        <main id="main-content" className="space-y-8">
          <article className="space-y-8">
            <CompanyHeader company={company} />
            <CompanyStats company={company} />
            <CompanyDescription company={company} />
            <CompanyTags company={company} />
          </article>

          <CompanyTabs company={company} activeTab={tab} />
        </main>
      </div>
    </div>
  );
}
