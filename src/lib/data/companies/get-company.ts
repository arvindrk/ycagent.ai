import { notFound } from 'next/navigation';
import { fetchCompanyById } from '@/lib/db/queries/companies.queries';
import type { Company } from '@/types/company';

export async function getCompany(id: string): Promise<Company> {
  const company = await fetchCompanyById(id);
  
  if (!company) {
    notFound();
  }
  
  return company;
}
