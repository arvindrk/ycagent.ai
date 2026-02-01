'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Target, Sparkles, CheckCircle2, Circle, Hash } from 'lucide-react';
import { CompaniesGrid } from '@/components/companies/companies-grid';
import type { SearchResult } from '@/lib/api/search/types';

interface TieredResultsDisplayProps {
  results: SearchResult[];
}

interface GroupedResults {
  tier: string;
  tierLabel: string;
  tierOrder: number;
  results: SearchResult[];
}

const tierConfig = {
  exact_match: {
    icon: Target,
    color: 'text-accent',
    bgColor: 'bg-accent-tint',
    borderColor: 'border-accent/30',
    description: 'Perfect name match',
  },
  high_confidence: {
    icon: Sparkles,
    color: 'text-blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Highly semantically relevant',
  },
  strong_match: {
    icon: CheckCircle2,
    color: 'text-green',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'Strong semantic match',
  },
  relevant: {
    icon: Circle,
    color: 'text-text-secondary',
    bgColor: 'bg-bg-tertiary',
    borderColor: 'border-primary',
    description: 'Moderately relevant',
  },
  keyword_match: {
    icon: Hash,
    color: 'text-text-tertiary',
    bgColor: 'bg-bg-secondary',
    borderColor: 'border-primary',
    description: 'Keyword matches only',
  },
};

export function TieredResultsDisplay({ results }: TieredResultsDisplayProps) {
  const groupedByTier = results.reduce((acc, result) => {
    const key = result.tier_order;
    if (!acc[key]) {
      acc[key] = {
        tier: result.tier,
        tierLabel: result.tier_label,
        tierOrder: result.tier_order,
        results: [],
      };
    }
    acc[key].results.push(result);
    return acc;
  }, {} as Record<number, GroupedResults>);

  const sortedTiers = Object.values(groupedByTier).sort(
    (a, b) => a.tierOrder - b.tierOrder
  );

  const defaultOpenTiers = sortedTiers.map(t => t.tier);

  return (
    <div className="space-y-6">
      <Accordion
        type="multiple"
        defaultValue={defaultOpenTiers}
        className="space-y-8"
      >
        {sortedTiers.map((tierGroup, index) => {
          const config = tierConfig[tierGroup.tier as keyof typeof tierConfig] || tierConfig.keyword_match;
          const Icon = config.icon;

          return (
            <div key={tierGroup.tier}>
              <AccordionItem value={tierGroup.tier} className="border-none">
                <AccordionTrigger className="hover:bg-bg-secondary rounded-lg p-3 -mx-3 transition-fast hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded ${config.bgColor} border ${config.borderColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-text-primary">
                        {tierGroup.tierLabel}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {tierGroup.results.length}
                      </Badge>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {config.description}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <CompaniesGrid companies={tierGroup.results} />
                </AccordionContent>
              </AccordionItem>
              {index < sortedTiers.length - 1 && (
                <hr className="mt-8 border-border-primary" />
              )}
            </div>
          );
        })}
      </Accordion>
    </div>
  );
}
