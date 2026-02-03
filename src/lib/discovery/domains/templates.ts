/**
 * Domain-specific seed query template generators
 * Simple, minimal queries for maximum recall
 */

interface CompanyData {
  name: string;
  website?: string;
  one_liner?: string;
  batch?: string;
  tags?: string[];
  industries?: string[];
  regions?: string[];
}

/**
 * Generates VC/funding research seed query
 * Example: Neon funding
 */
export function generateVCSeed(company: CompanyData): string {
  return `${company.name} venture capital funding rounds`;
}

/**
 * Generates founder research seed query
 * Example: Neon founder
 */
export function generateFounderSeed(company: CompanyData): string {
  return `${company.name} founders`;
}

/**
 * Generates product research seed query
 * Example: Neon product
 */
export function generateProductSeed(company: CompanyData): string {
  return `${company.name} product`;
}

/**
 * Generate domain-specific seed query
 * Uses simple switch for clarity (no registry overhead)
 *
 * @param domain - Research domain type
 * @param company - Company data for context
 * @returns Optimized search query string
 */
export function generateSeedQuery(
  domain: 'vc_profile' | 'founder_profile' | 'product_info',
  company: CompanyData
): string {
  switch (domain) {
    case 'vc_profile':
      return generateVCSeed(company);
    case 'founder_profile':
      return generateFounderSeed(company);
    case 'product_info':
      return generateProductSeed(company);
  }
}
