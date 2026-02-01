'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GitCompare } from 'lucide-react';
import CompanyDetailsTab from './tabs/company-details-tab';
import { ResearchContainer } from '@/components/research/research-container';
import type { Company } from '@/types/company';

interface CompanyTabsProps {
  company: Company;
  activeTab?: string;
}

export function CompanyTabs({ company, activeTab = 'details' }: CompanyTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams();
    if (value !== 'details') {
      params.set('tab', value);
    }
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList aria-label="Company information sections">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="research">Research Dossier</TabsTrigger>
        <TabsTrigger value="similar">Similar Companies</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-6">
        <CompanyDetailsTab company={company} />
      </TabsContent>

      <TabsContent value="research" className="mt-6">
        <ResearchContainer company={company} />
      </TabsContent>

      <TabsContent value="similar" className="mt-6">
        <Alert>
          <GitCompare className="w-5 h-5" aria-hidden="true" />
          <AlertTitle>Similar Companies Coming Soon</AlertTitle>
          <AlertDescription>
            Discover companies with similar profiles based on industry, stage,
            and tags.
          </AlertDescription>
        </Alert>
      </TabsContent>
    </Tabs>
  );
}
