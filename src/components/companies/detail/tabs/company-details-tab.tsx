import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import type { Company } from '@/types/company';

interface CompanyDetailsTabProps {
  company: Company;
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

export default function CompanyDetailsTab({ company }: CompanyDetailsTabProps) {

  return (
    <div className="space-y-6">
      <Card className="bg-bg-secondary border-border-primary">
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="text-[17px] font-medium mb-4">Data Source</h3>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[15px] text-text-secondary">
                    Information sourced from{' '}
                    <span className="font-medium text-text-primary">
                      {company.source === 'yc' ? 'Y\u00A0Combinator' : company.source}
                    </span>
                  </p>
                  {company.source_url && (
                    <a
                      href={company.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    >
                      View original listing
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              {company.last_synced_at && (
                <p className="text-[13px] text-text-tertiary">
                  Last synced: {formatRelativeTime(company.last_synced_at)}
                </p>
              )}
            </div>
          </div>

          {company.is_nonprofit && (
            <div>
              <h3 className="text-[17px] font-medium mb-3">Organization Type</h3>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                Nonprofit Organization
              </Badge>
            </div>
          )}

          {company.source_metadata && 
            typeof company.source_metadata === 'object' && 
            Object.keys(company.source_metadata).length > 0 && (
            <div>
              <h3 className="text-[17px] font-medium mb-3">Additional Metadata</h3>
              <div className="text-[13px] text-text-tertiary font-mono bg-bg-tertiary p-4 rounded-md overflow-x-auto">
                <pre>{JSON.stringify(company.source_metadata, null, 2)}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
