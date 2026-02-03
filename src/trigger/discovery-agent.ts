import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3';
import {
  discoveryTaskPayloadSchema,
  discoveryConfigSchema,
} from '@/lib/validations/research.schema';
import type {
  DiscoveryTaskOutput,
  DiscoveryTaskPayload,
} from '@/lib/validations/research.schema';
import { fetchCompanyById } from '@/lib/db/queries/companies.queries';
import {
  createResearchRun,
  createSearchQuery,
  completeDiscovery,
} from '@/lib/db/queries/research.queries';
import { getSearchProvider } from '@/lib/discovery/search';
import { generateSeedQuery } from '@/lib/discovery/domains/templates';
import { ScraperModule, getScraperProvider } from '@/lib/scraping';
import type { ScrapeStats } from '@/lib/scraping/types';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

interface CompanyData {
  name: string;
  website?: string;
  one_liner?: string;
  batch?: string;
  tags: string[];
  industries: string[];
  regions: string[];
}

async function getCompanyData(payload: DiscoveryTaskPayload): Promise<CompanyData> {
  if (payload.companyName) {
    logger.info('using_provided_company_data', { companyName: payload.companyName });
    return {
      name: payload.companyName,
      website: payload.companyWebsite,
      one_liner: payload.companyDescription,
      batch: payload.companyBatch,
      tags: payload.companyTags || [],
      industries: payload.companyIndustries || [],
      regions: [],
    };
  }

  const company = await fetchCompanyById(payload.companyId);
  if (!company) {
    throw new Error(`Company not found: ${payload.companyId}`);
  }

  logger.info('fetched_company_from_db', { companyName: company.name });
  return {
    name: company.name,
    website: company.website || undefined,
    one_liner: company.one_liner || undefined,
    batch: company.batch || undefined,
    tags: Array.isArray(company.tags) ? company.tags : [],
    industries: Array.isArray(company.industries) ? company.industries : [],
    regions: Array.isArray(company.regions) ? company.regions : [],
  };
}

function buildDiscoveryStats(
  scraperStats: ScrapeStats,
  resultsCount: number,
  durationMs: number
) {
  return {
    queriesExecuted: 1,
    sourcesDiscovered: resultsCount,
    sourcesScraped: scraperStats.scraped,
    sourcesFailed: scraperStats.failed,
    totalContentLength: scraperStats.totalContentLength || 0,
    avgScrapeDurationMs: scraperStats.avgDurationMs || 0,
    durationMs,
    currentDepth: 0,
    budgetExhausted: false,
  };
}

export const discoveryAgent = schemaTask({
  id: 'discovery-research',
  schema: discoveryTaskPayloadSchema,
  maxDuration: 600,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload, { ctx }): Promise<DiscoveryTaskOutput> => {
    const startTime = Date.now();
    const { companyId, domain = 'product_info' } = payload;

    console.log('\n🔍 [Discovery] Starting discovery research');
    console.log(`   Company ID: ${companyId}`);
    console.log(`   Domain: ${domain}`);
    console.log(`   Run ID: ${ctx.run.id}`);

    logger.info('discovery_started', { companyId, domain });
    metadata.set('status', 'running');
    metadata.set('companyId', companyId);
    metadata.set('domain', domain);

    try {
      metadata.set('currentStep', 'fetching_company_data');
      const companyData = await getCompanyData(payload);
      console.log(`   ✓ Company data loaded: ${companyData.name}`);

      const config = discoveryConfigSchema.parse({
        maxDepth: 0,
        maxBreadth: 2,
        maxQueries: 1,
        maxSources: 10,
        platforms: ['google'],
        ...payload.config,
      });

      metadata.set('currentStep', 'generating_seed_query');
      const queryText = generateSeedQuery(domain, companyData);
      console.log(`   ✓ Generated query: "${queryText}"`);
      logger.info('generated_seed_query', { domain, queryText });

      metadata.set('currentStep', 'creating_research_run');
      const run = await createResearchRun({
        companyId,
        domain,
        config,
        seedData: {
          name: companyData.name,
          website: companyData.website,
          description: companyData.one_liner,
          batch: companyData.batch,
          tags: companyData.tags,
          industries: companyData.industries,
        },
        triggerRunId: ctx.run.id,
        triggerIdempotencyKey: ctx.run.idempotencyKey || undefined,
        status: 'running',
        startedAt: new Date(),
      });

      console.log(`   ✓ Research run created: ${run.id}`);
      logger.info('research_run_created', { runId: run.id, domain });
      metadata.set('runId', run.id);

      metadata.set('currentStep', 'creating_search_query');
      const query = await createSearchQuery({
        runId: run.id,
        domain,
        queryText,
        platform: 'google',
        depth: 0,
      });

      metadata.set('currentStep', 'executing_search');
      metadata.set('queryId', query.id);

      const queryStartTime = Date.now();
      const provider = getSearchProvider('google');

      logger.info('executing_search', { provider: 'google', queryText, domain });

      const response = await provider.search({
        query: queryText,
        platform: 'google',
        maxResults: 10,
      });

      const queryDurationMs = Date.now() - queryStartTime;
      console.log(`   ✓ Search completed: ${response.results.length} results in ${queryDurationMs}ms`);
      logger.info('search_completed', {
        resultsCount: response.results.length,
        durationMs: queryDurationMs,
      });

      metadata.set('currentStep', 'discovering_and_scraping');
      metadata.set('urlsDiscovered', response.results.length);

      const scraper = new ScraperModule(getScraperProvider('firecrawl'));
      const resultsWithRank = response.results.map((r, i) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        rank: r.rank || i + 1,
        metadata: r.metadata,
      }));

      await scraper.discoverUrls(run.id, query.id, resultsWithRank);
      console.log(`   ⏳ Scraping ${resultsWithRank.length} URLs...`);

      const { stats } = await scraper.scrapePendingUrls(run.id);
      console.log(`   ✓ Scraping complete: ${stats.scraped} succeeded, ${stats.failed} failed`);

      metadata.set('urlsScraped', stats.scraped);

      metadata.set('currentStep', 'saving_results');
      await completeDiscovery({
        runId: run.id,
        queryId: query.id,
        queryStartedAt: new Date(queryStartTime),
        queryDurationMs,
        resultsCount: response.results.length,
        resultsJson: resultsWithRank,
      });

      const totalDuration = Date.now() - startTime;
      metadata.set('status', 'completed');
      metadata.set('totalDurationMs', totalDuration);

      console.log(`\n✅ [Discovery] Completed in ${(totalDuration / 1000).toFixed(2)}s`);
      console.log(`   Results: ${response.results.length} sources`);
      console.log(`   Scraped: ${stats.scraped} URLs (${((stats.totalContentLength || 0) / 1024).toFixed(1)}KB)`);
      console.log(`   Run ID: ${run.id}\n`);

      logger.info('discovery_completed', {
        runId: run.id,
        domain,
        durationMs: totalDuration,
        resultsCount: response.results.length,
        urlsScraped: stats.scraped,
        urlsFailed: stats.failed,
        totalContentLength: stats.totalContentLength,
      });

      return {
        runId: run.id,
        companyId,
        domain,
        status: 'completed',
        stats: buildDiscoveryStats(stats, response.results.length, totalDuration),
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      console.log(`\n❌ [Discovery] Failed: ${errorMessage}`);
      console.log(`   Company ID: ${companyId}`);
      console.log(`   Domain: ${domain}\n`);

      metadata.set('status', 'failed');
      metadata.set('error', errorMessage);

      logger.error('discovery_failed', {
        companyId,
        domain,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        runId: ctx.run.id,
        companyId,
        domain,
        status: 'failed',
        stats: buildDiscoveryStats(
          { total: 0, scraped: 0, pending: 0, failed: 0 },
          0,
          Date.now() - startTime
        ),
        error: {
          message: errorMessage,
          retryable: true,
        },
      };
    }
  },
});
