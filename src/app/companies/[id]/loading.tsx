import { PageHeader } from '@/components/layout/page-header';
import { CompanyDetailSkeleton } from '@/components/companies/detail/company-detail-skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <PageHeader
        title="Deep Research Agent"
        subtitle="AI-powered research using live browser automation, web crawling, and synthesis"
        showBackLink
      />

      <div className="container mx-auto px-4 py-8">
        <CompanyDetailSkeleton />
      </div>
    </div>
  );
}
