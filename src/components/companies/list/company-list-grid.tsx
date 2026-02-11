import { CompanyPreviewCard } from './company-preview-card';
import { CompanyListEmptyState } from './company-list-empty-state';
import type { CompanyListItem } from '@/types/company';

interface CompanyListGridProps {
  companies: CompanyListItem[];
}

export function CompanyListGrid({ companies }: CompanyListGridProps) {
  if (companies.length === 0) {
    return <CompanyListEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {companies.map((company) => (
        <CompanyPreviewCard key={company.id} company={company} />
      ))}
    </div>
  );
}
