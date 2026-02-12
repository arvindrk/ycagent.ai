import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Company } from '@/types/company.types';

interface CompanyTaxonomySectionProps {
  company: Company;
}

export function CompanyTaxonomySection({ company }: CompanyTaxonomySectionProps) {

  const hasIndustries = company.industries && company.industries.length > 0;
  const hasTags = company.tags && company.tags.length > 0;
  const hasRegions = company.regions && company.regions.length > 0;

  if (!hasIndustries && !hasTags && !hasRegions) return null;

  return (
    <section aria-labelledby="company-categories-heading" className="space-y-6">
      <h2 id="company-categories-heading" className="sr-only">
        Company Categories and Tags
      </h2>

      {hasIndustries && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-text-secondary">
            Industries
          </h3>
          <div className="flex flex-wrap gap-2">
            {company.industries.map((industry) => (
              <Badge
                key={industry}
                variant="default"
                className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
              >
                {industry}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasIndustries && hasTags && <Separator />}

      {hasTags && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-text-secondary">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {company.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(hasIndustries || hasTags) && hasRegions && <Separator />}

      {hasRegions && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-text-secondary">
            Regions
          </h3>
          <div className="flex flex-wrap gap-2">
            {company.regions.map((region) => (
              <Badge key={region} variant="outline">
                {region}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
