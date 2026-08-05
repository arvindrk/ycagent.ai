'use client';

import Link from 'next/link';
import posthog from 'posthog-js';
import { Badge } from '@/components/ui/badge';
import { CompanyLogo } from '@/components/companies/company-logo';
import type { CompanyListItem } from '@/types/company.types';
import { MapPin, Zap } from 'lucide-react';

interface CompanyPreviewCardProps {
  company: CompanyListItem;
}

const SEASON_INITIAL: Record<string, string> = {
  Winter: 'W',
  Summer: 'S',
  Fall: 'F',
  Spring: 'X',
};

function formatBatch(batch: string): string {
  const match = batch.match(/^(Winter|Summer|Fall|Spring)\s+(\d{4})$/);
  if (!match) return batch;
  const [, season, year] = match;
  return `${SEASON_INITIAL[season]}${year.slice(-2)}`;
}

const MAX_TAGS = 3;

export function CompanyPreviewCard({ company }: CompanyPreviewCardProps) {
  const tags = company.tags.slice(0, MAX_TAGS);
  const overflowCount = company.tags.length - tags.length;

  return (
    // The name anchor stretches over the whole card, so the card is a single
    // link and the research action is a sibling. Nesting them would be invalid
    // markup and would put the action out of reach of the keyboard.
    <article className="group relative flex h-full flex-col gap-3 rounded-lg border border-border-primary bg-bg-primary p-4 transition-colors focus-within:border-border-tertiary hover:border-border-secondary">
      <div className="flex items-start gap-3">
        <CompanyLogo logoUrl={company.logo_url} companyName={company.name} size={40} />

        <h3 className="min-w-0 flex-1 text-[15px] font-medium leading-tight text-text-primary">
          <Link
            href={`/companies/${company.id}`}
            prefetch={false}
            className="block truncate rounded-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`View details for ${company.name}`}
            onClick={() =>
              posthog.capture('company_card_clicked', {
                company_id: company.id,
                company_name: company.name,
                company_batch: company.batch,
              })
            }
          >
            {company.name}
          </Link>
        </h3>

        {company.batch && (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {formatBatch(company.batch)}
          </Badge>
        )}
      </div>

      {company.one_liner && (
        <p className="line-clamp-2 text-sm leading-snug text-text-secondary">
          {company.one_liner}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {company.all_locations && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{company.all_locations}</span>
            </span>
          )}
          {company.is_hiring && (
            <span className="flex shrink-0 items-center gap-1.5 text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
              Hiring
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <Badge variant="outline" className="text-xs font-normal text-text-tertiary">
                +{overflowCount}
              </Badge>
            )}
          </div>
        )}

        <Link
          href={`/companies/${company.id}?autostart=true`}
          prefetch={false}
          className="relative z-10 inline-flex items-center justify-center gap-1.5 rounded-md border border-border-primary py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-label={`Start deep research on ${company.name}`}
          onClick={() =>
            posthog.capture('deep_research_cta_clicked', {
              company_id: company.id,
              company_name: company.name,
              source: 'listing_card',
            })
          }
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          Deep Research
        </Link>
      </div>
    </article>
  );
}
