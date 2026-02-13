import { cache } from 'react';
import { notFound } from 'next/navigation';
import { fetchCompanyById } from '@/lib/db/queries/companies.queries';
import type { Company } from '@/types/company.types';

export const getCompany = cache(async (id: string): Promise<Company> => {
  try {
    const company = await fetchCompanyById(id);

    if (!company) {
      notFound();
    }

    return company;
  } catch {
    throw new Error('Unexpected Error. Please try again.');
  }
});
