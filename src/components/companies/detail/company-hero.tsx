import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  Building2,
  Calendar,
  Users,
  MapPin,
  Briefcase,
} from 'lucide-react';
import type { Company } from '@/types/company';

interface CompanyHeroProps {
  company: Company;
  onStartResearch?: () => void;
  onStopResearch?: () => void;
  isResearching?: boolean;
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
              <Button variant="yc-accent" asChild>
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
            <p className="text-[13px] text-text-tertiary">
              Last updated {formatRelativeTime(company.last_synced_at)}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <Card className="md:col-span-2 lg:col-span-1">
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
