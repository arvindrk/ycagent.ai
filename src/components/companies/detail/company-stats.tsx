import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, MapPin, Briefcase } from 'lucide-react';
import { getCompany } from '@/lib/data/companies/get-company';

interface CompanyStatsProps {
  id: string;
}

export async function CompanyStats({ id }: CompanyStatsProps) {
  const company = await getCompany(id);

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

  if (stats.length === 0) return null;

  return (
    <section aria-labelledby="company-stats-heading">
      <h2 id="company-stats-heading" className="sr-only">
        Company Statistics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-bg-secondary border-border-primary">
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-text-tertiary">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="text-[13px]">{stat.label}</span>
                </div>
                <p className="text-[17px] font-medium tabular-nums">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
