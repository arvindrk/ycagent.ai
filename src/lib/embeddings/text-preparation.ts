import type { Company } from './types';

export function createEmbeddingText(company: Company): string {
  const parts = [
    company.name,
    company.one_liner,
    company.long_description,
    company.tags?.length > 0
      ? `Categories: ${company.tags.join(', ')}`
      : null,
    company.industries?.length > 0
      ? `Industries: ${company.industries.join(', ')}`
      : null,
    company.all_locations ? `Location: ${company.all_locations}` : null,
    company.batch ? `YC ${company.batch}` : null,
  ];

  return parts.filter(Boolean).join('. ');
}

export function prepareCompanyForEmbedding(company: Company) {
  return {
    id: company.id,
    text: createEmbeddingText(company),
  };
}
