import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CompanyListItem } from '@/types/company';
import { Building2, MapPin } from 'lucide-react';
import Image from 'next/image';

interface CompanyCardProps {
  company: CompanyListItem;
}

function formatBatch(batch: string): string {
  const seasonMap: Record<string, string> = {
    'Winter': 'W',
    'Summer': 'S',
    'Fall': 'F',
    'Spring': 'X'
  };

  const match = batch.match(/^(Winter|Summer|Fall|Spring)\s+(\d{4})$/);
  if (!match) return batch;

  const [, season, year] = match;
  const shortYear = year.slice(-2);
  return `${seasonMap[season]}${shortYear}`;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const displayTags = company.tags.slice(0, 3);
  const hasMoreTags = company.tags.length > 3;

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {company.logo_url ? (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                <Image
                  src={company.logo_url}
                  alt={`${company.name} logo`}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-lg leading-tight truncate min-w-0">
              {company.name}
            </CardTitle>
          </div>
          {company.batch && (
            <Badge variant="secondary" className="flex-shrink-0">
              {formatBatch(company.batch)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {company.one_liner && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.one_liner}
          </p>
        )}

        {company.all_locations && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{company.all_locations}</span>
          </div>
        )}

        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {hasMoreTags && (
              <Badge variant="outline" className="text-xs">
                +{company.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {company.is_hiring && (
          <div className="pt-2 border-t">
            <Badge className="bg-green-500 hover:bg-green-600">
              Hiring
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
