import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  Calendar,
  Users,
  MapPin,
  Briefcase,
} from 'lucide-react';
import type { Company } from '@/types/company.types';
import { formatRelativeSyncedLabel } from '@/lib/format-relative-synced-label';
import { CompanyLogo } from '@/components/companies/company-logo';

interface CompanyHeroProps {
  company: Company;
  onStartResearch?: () => void;
  onStopResearch?: () => void;
  isResearching?: boolean;
}

export function CompanyHero({
  company,
  onStartResearch,
  onStopResearch,
  isResearching = false
}: CompanyHeroProps) {
  const stats = [
    company.founded_at && {
      icon: Calendar,
      label: 'Founded',
      value: new Date(company.founded_at).getFullYear(),
    },
    company.stage && {
      icon: Briefcase,
      label: 'Stage',
      value: company.stage,
    },
    company.team_size && {
      icon: Users,
      label: 'Team Size',
      value: `${company.team_size}\u00A0people`,
    },
    company.all_locations && {
      icon: MapPin,
      label: 'Location',
      value: company.all_locations,
    },
  ].filter(Boolean) as Array<{
    icon: typeof Calendar | typeof Briefcase | typeof Users | typeof MapPin;
    label: string;
    value: string | number;
  }>;
  return (
    <header className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] lg:grid-cols-[120px_1fr_240px] gap-6">
        <CompanyLogo
          logoUrl={company.logo_url}
          companyName={company.name}
          size={120}
          priority
          className="rounded-lg"
        />

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
              <Badge variant="default">{company.batch}</Badge>
            )}
            {company.status && (
              <Badge variant="default">{company.status}</Badge>
            )}
            {company.is_hiring && (
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20">
                Hiring
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {company.source_url && (
              <Button asChild>
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
            {(onStartResearch || onStopResearch) && (
              <Button
                variant={isResearching ? "destructive" : "accent"}
                onClick={isResearching ? onStopResearch : onStartResearch}
                aria-label={isResearching ? 'Stop research' : `Deep research ${company.name}`}
              >
                {isResearching ? 'Stop Research' : `Deep Research ${company.name}`}
              </Button>
            )}
          </div>

          {company.last_synced_at && (
            <p
              className="text-[13px] text-text-tertiary"
              title={`last_synced_at: ${company.last_synced_at} updated_at: ${company.updated_at || ''} created_at: ${company.created_at || ''}`}
            >
              {formatRelativeSyncedLabel(company.last_synced_at)}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <Card className="md:col-span-2 lg:col-span-1 border border-transparent hover:border-transparent">
            <CardContent className="p-6 space-y-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="space-y-1">
                    <div className="flex items-center gap-2 text-text-tertiary">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-[13px]">{stat.label}</span>
                    </div>
                    <p className="text-base font-medium tabular-nums">
                      {stat.value}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />
    </header>
  );
}
