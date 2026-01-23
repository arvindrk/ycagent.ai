import { sql } from '../db';

interface YCCompany {
  id: number;
  name: string;
  slug: string;
  former_names: string[];
  small_logo_thumb_url: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  highlight_black: boolean;
  highlight_latinx: boolean;
  highlight_women: boolean;
  industry: string;
  subindustry: string;
  launched_at: number;
  tags: string[];
  top_company: boolean;
  isHiring: boolean;
  nonprofit: boolean;
  batch: string;
  status: string;
  industries: string[];
  regions: string[];
  stage: string;
  url: string;
}

async function fetchYCCompanies(): Promise<YCCompany[]> {
  console.log('Fetching YC companies from API...');
  
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 60000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      
      const response = await fetch(
        'https://yc-oss.github.io/api/companies/all.json',
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch YC companies: ${response.statusText}`);
      }
      
      const companies = await response.json();
      console.log(`Fetched ${companies.length} companies`);
      return companies;
      
    } catch (error) {
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to fetch after ${MAX_RETRIES} attempts`);
      }
      
      const delay = attempt * 2000;
      console.log(`Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unreachable');
}

function validateYCCompany(yc: YCCompany): boolean {
  if (!yc.id || !yc.name || !yc.slug) {
    console.warn(`Invalid company data: missing required fields`, { id: yc.id, name: yc.name, slug: yc.slug });
    return false;
  }
  
  if (yc.name.length > 255) {
    console.warn(`Company name too long: ${yc.name.substring(0, 50)}...`);
    return false;
  }
  
  return true;
}

function transformYCCompany(yc: YCCompany) {
  return {
    source: 'yc',
    source_id: yc.id.toString(),
    source_url: yc.url,
    name: yc.name,
    slug: yc.slug,
    website: yc.website || null,
    logo_url: yc.small_logo_thumb_url || null,
    one_liner: yc.one_liner || null,
    long_description: yc.long_description || null,
    tags: JSON.stringify(yc.tags || []),
    industries: JSON.stringify(yc.industries || []),
    regions: JSON.stringify(yc.regions || []),
    batch: yc.batch || null,
    team_size: yc.team_size || null,
    founded_at: yc.launched_at ? new Date(yc.launched_at * 1000).toISOString() : null,
    stage: yc.stage || null,
    status: yc.status || 'Active',
    is_hiring: yc.isHiring || false,
    is_nonprofit: yc.nonprofit || false,
    all_locations: yc.all_locations || null,
    source_metadata: JSON.stringify({
      top_company: yc.top_company,
      highlight_black: yc.highlight_black,
      highlight_latinx: yc.highlight_latinx,
      highlight_women: yc.highlight_women,
      former_names: yc.former_names || [],
    }),
  };
}

async function upsertCompanies(companies: ReturnType<typeof transformYCCompany>[]) {
  console.log(`Upserting ${companies.length} companies...`);
  
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    
    try {
      for (const company of batch) {
        await sql`
          INSERT INTO companies (
            source, source_id, source_url, name, slug, website, logo_url,
            one_liner, long_description, tags, industries, regions, batch,
            team_size, founded_at, stage, status, is_hiring, is_nonprofit,
            all_locations, source_metadata, last_synced_at
          ) VALUES (
            ${company.source}, ${company.source_id}, ${company.source_url},
            ${company.name}, ${company.slug}, ${company.website}, ${company.logo_url},
            ${company.one_liner}, ${company.long_description}, 
            ${company.tags}::jsonb, ${company.industries}::jsonb, ${company.regions}::jsonb,
            ${company.batch}, ${company.team_size}, ${company.founded_at}, ${company.stage},
            ${company.status}, ${company.is_hiring}, ${company.is_nonprofit},
            ${company.all_locations}, ${company.source_metadata}::jsonb, NOW()
          )
          ON CONFLICT (source, source_id) 
          DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            website = EXCLUDED.website,
            logo_url = EXCLUDED.logo_url,
            one_liner = EXCLUDED.one_liner,
            long_description = EXCLUDED.long_description,
            tags = EXCLUDED.tags,
            industries = EXCLUDED.industries,
            regions = EXCLUDED.regions,
            batch = EXCLUDED.batch,
            team_size = EXCLUDED.team_size,
            founded_at = EXCLUDED.founded_at,
            stage = EXCLUDED.stage,
            status = EXCLUDED.status,
            is_hiring = EXCLUDED.is_hiring,
            is_nonprofit = EXCLUDED.is_nonprofit,
            all_locations = EXCLUDED.all_locations,
            source_metadata = EXCLUDED.source_metadata,
            updated_at = NOW(),
            last_synced_at = NOW()
        `;
      }
      
      successCount += batch.length;
      console.log(`Progress: ${successCount}/${companies.length} companies upserted`);
      
    } catch (error) {
      errorCount += batch.length;
      console.error(`Failed to upsert batch ${i / BATCH_SIZE + 1}:`, error);
      console.error(`Companies in failed batch: ${batch.map(c => c.name).join(', ')}`);
      
      if (errorCount > companies.length * 0.1) {
        throw new Error(`Too many failures: ${errorCount}/${companies.length}. Aborting.`);
      }
    }
  }
  
  console.log(`\nUpsert complete: ${successCount} successful, ${errorCount} failed`);
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('Starting YC company ingestion...\n');
    
    const ycCompanies = await fetchYCCompanies();
    
    const validCompanies = ycCompanies.filter(validateYCCompany);
    console.log(`Validated: ${validCompanies.length}/${ycCompanies.length} companies passed validation\n`);
    
    const transformedCompanies = validCompanies.map(transformYCCompany);
    
    await upsertCompanies(transformedCompanies);
    
    const result = await sql`SELECT COUNT(*) as count FROM companies WHERE source = 'yc'`;
    console.log(`\nTotal YC companies in database: ${result[0].count}`);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Ingestion completed successfully in ${duration}s!`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ Ingestion failed after ${duration}s:`, error);
    process.exit(1);
  }
}

main();
