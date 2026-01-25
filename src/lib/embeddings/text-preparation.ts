import type { Company } from './types';

/**
 * Pure function: Create embedding text from company data
 * No vendor dependencies - can be used with any embedding provider
 * Prioritizes description content over metadata
 */
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

/**
 * Pure function: Prepare company for embedding
 * Returns structured data ready for embedding
 */
export function prepareCompanyForEmbedding(company: Company) {
  return {
    id: company.id,
    text: createEmbeddingText(company),
  };
}
