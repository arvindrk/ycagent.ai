'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CompanyListGrid } from '@/components/companies/list/company-list-grid';
import { buildTierBucketModel } from '@/lib/semantic-search/build-tier-bucket-model';
import { TIER_META } from '@/lib/semantic-search/scoring/weights';
import type { SearchResult } from '@/types/semantic-search.types';

interface TieredResultsDisplayProps {
  results: SearchResult[];
}

export function TieredResultsDisplay({ results }: TieredResultsDisplayProps) {
  const buckets = buildTierBucketModel(results);
  const defaultOpenTiers = buckets.filter((b) => !b.isEmpty).map((b) => b.tier);

  return (
    <div className="space-y-6">
      <div className="text-xs text-text-tertiary mb-2">{Object.values(TIER_META).sort((a, b) => a.order - b.order).map((t) => t.description).join(' • ')}. Higher final score ranks first (hover score badges on cards for breakdown).</div>
      <Accordion
        type="multiple"
        defaultValue={defaultOpenTiers}
        className="space-y-8"
      >
        {buckets.map((bucket, index) => {
          const config = TIER_META[bucket.tier];
          const Icon = config.icon;

          if (bucket.isEmpty) {
            return (
              <div key={bucket.tier}>
                <div className="flex items-center gap-3 p-3 -mx-3 rounded-lg opacity-70">
                  <div className={`p-2 rounded ${config.bgColor} border ${config.borderColor}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-text-secondary">
                      {bucket.tierLabel}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      0
                    </Badge>
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {bucket.emptyMessage}
                  </span>
                </div>
                {index < buckets.length - 1 && (
                  <hr className="mt-8 border-border-primary" />
                )}
              </div>
            );
          }

          return (
            <div key={bucket.tier}>
              <AccordionItem value={bucket.tier} className="border-none">
                <AccordionTrigger className="hover:bg-bg-secondary rounded-lg p-3 -mx-3 transition-fast hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded ${config.bgColor} border ${config.borderColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-text-primary">
                        {bucket.tierLabel}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {bucket.results.length}
                      </Badge>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {config.description}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <CompanyListGrid companies={bucket.results} />
                </AccordionContent>
              </AccordionItem>
              {index < buckets.length - 1 && (
                <hr className="mt-8 border-border-primary" />
              )}
            </div>
          );
        })}
      </Accordion>
    </div>
  );
}
