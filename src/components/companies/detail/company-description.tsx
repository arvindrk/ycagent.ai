'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Company } from '@/types/company';

interface CompanyDescriptionProps {
  company: Company;
}

export function CompanyDescription({ company }: CompanyDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const description = company.long_description || company.one_liner;
  if (!description) return null;

  const isLong = description.length > 300;
  const displayText = isLong && !isExpanded
    ? description.slice(0, 300) + '…'
    : description;

  return (
    <section aria-labelledby="company-description-heading">
      <h2 id="company-description-heading" className="sr-only">
        Company Description
      </h2>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-[17px] font-medium">About</h3>
          <p className="text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            {displayText}
          </p>

          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-text-secondary hover:text-text-primary"
            >
              {isExpanded ? (
                <>
                  Show less
                  <ChevronUp className="w-4 h-4 ml-2" aria-hidden="true" />
                </>
              ) : (
                <>
                  Read more
                  <ChevronDown className="w-4 h-4 ml-2" aria-hidden="true" />
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
