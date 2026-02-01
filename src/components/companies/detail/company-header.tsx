import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Building2 } from 'lucide-react';
import type { Company } from '@/types/company';

interface CompanyHeaderProps {
  company: Company;
}

function formatBatch(batch: string): string {
  const seasonMap: Record<string, string> = {
    Winter: 'W',
    Summer: 'S',
    Fall: 'F',
    Spring: 'X',
  };

  const match = batch.match(/^(Winter|Summer|Fall|Spring)\s+(\d{4})$/);
  if (!match) return batch;

  const [, season, year] = match;
  const shortYear = year.slice(-2);
  return `${seasonMap[season]}${shortYear}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}\u00A0days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}\u00A0weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}\u00A0months ago`;
  return `${Math.floor(diffDays / 365)}\u00A0years ago`;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <Avatar className="w-[120px] h-[120px] rounded-lg flex-shrink-0">
          <AvatarImage
            src={company.logo_url || ''}
            alt={`${company.name} logo`}
            width={120}
            height={120}
          />
          <AvatarFallback className="rounded-lg bg-bg-secondary">
            <Building2
              className="w-12 h-12 text-text-tertiary"
              aria-hidden="true"
            />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <h1 className="text-[40px] font-semibold tracking-[-0.88px] text-wrap-balance leading-tight">
              {company.name}
            </h1>
            {company.one_liner && (
              <p className="text-[17px] text-text-secondary mt-2 leading-relaxed">
                {company.one_liner}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {company.batch && (
              <Badge variant="secondary">{formatBatch(company.batch)}</Badge>
            )}
            {company.status && (
              <Badge variant="outline">{company.status}</Badge>
            )}
            {company.is_hiring && (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20">
                Hiring
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {company.website && (
              <Button asChild>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit ${company.name} website`}
                >
                  Visit Website
                  <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                </a>
              </Button>
            )}
            {company.source_url && (
              <Button variant="secondary" asChild>
                <a
                  href={company.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View ${company.name} on Y Combinator`}
                >
                  View on YC
                  <ExternalLink className="w-4 h-4 ml-2" aria-hidden="true" />
                </a>
              </Button>
            )}
          </div>

          {company.last_synced_at && (
            <p className="text-[13px] text-text-tertiary">
              Last updated {formatRelativeTime(company.last_synced_at)}
            </p>
          )}
        </div>
      </div>

      <Separator />
    </header>
  );
}
