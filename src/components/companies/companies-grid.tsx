import { CompanyCard } from './company-card';
import { CompaniesEmpty } from './companies-empty';
import type { CompanyListItem } from '@/types/company';

interface CompaniesGridProps {
  companies: CompanyListItem[];
}

export function CompaniesGrid({ companies }: CompaniesGridProps) {
  if (companies.length === 0) {
    return <CompaniesEmpty />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
