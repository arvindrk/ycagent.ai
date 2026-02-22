'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompanyListItem } from '@/types/company.types';
import { Building2, MapPin, Zap } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface CompanyPreviewCardProps {
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

export function CompanyPreviewCard({ company }: CompanyPreviewCardProps) {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const displayTags = company.tags.slice(0, 3);
  const hasMoreTags = company.tags.length > 3;

  const handleDeepResearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    posthog.capture('deep_research_cta_clicked', {
      company_id: company.id,
      company_name: company.name,
      source: 'listing_card',
    });
    router.push(`/companies/${company.id}?autostart=true`);
  };

  return (
    <Link
      href={`/companies/${company.id}`}
      prefetch={false}
      className="block group transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
      aria-label={`View details for ${company.name}`}
      onClick={() =>
        posthog.capture('company_card_clicked', {
          company_id: company.id,
          company_name: company.name,
          company_batch: company.batch,
        })
      }
    >
      <Card variant="interactive" className="flex flex-col h-full relative overflow-hidden">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {company.logo_url ? (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <Image
                    src={imageError ? '/yc.png' : company.logo_url}
                    alt={`${company.name} logo`}
                    width={48}
                    height={48}
                    className={`object-contain ${imageError ? 'grayscale opacity-60' : ''}`}
                    onError={() => setImageError(true)}
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

          {/* Mobile: always-visible research CTA */}
          <div className="sm:hidden pt-3 mt-1 border-t">
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-accent"
              onClick={handleDeepResearch}
              aria-label={`Deep research ${company.name}`}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Deep Research
            </Button>
          </div>
        </CardContent>

        {/* Desktop: hover overlay */}
        <div
          className="hidden sm:flex absolute inset-x-0 bottom-0 items-end justify-center pb-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gradient-to-t from-bg-secondary/95 to-transparent pointer-events-none group-hover:pointer-events-auto"
          aria-hidden="true"
        >
          <Button
            size="sm"
            variant="accent"
            onClick={handleDeepResearch}
            aria-label={`Deep research ${company.name}`}
            tabIndex={-1}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Deep Research
          </Button>
        </div>
      </Card>
    </Link>
  );
}
