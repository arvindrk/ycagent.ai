import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3';
import {
  discoveryTaskPayloadSchema,
  discoveryConfigSchema,
} from '@/lib/validations/research.schema';
import type { DiscoveryTaskOutput } from '@/lib/validations/research.schema';
import { fetchCompanyById } from '@/lib/db/queries/companies.queries';
import {
  createResearchRun,
  createSearchQuery,
  completeDiscovery,
} from '@/lib/db/queries/research.queries';
import { getSearchProvider } from '@/lib/discovery/search';
import { generateSeedQuery } from '@/lib/discovery/domains/templates';

export const discoveryTask = schemaTask({
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

    logger.info('discovery_started', { companyId, domain });

    metadata.set('status', 'running');
    metadata.set('companyId', companyId);
    metadata.set('domain', domain);
    metadata.set('currentStep', 'fetching_company_data');
    console.log(payload);
    try {
      let companyData;
      if (payload.companyName) {
        companyData = {
          name: payload.companyName,
          website: payload.companyWebsite,
          one_liner: payload.companyDescription,
          batch: payload.companyBatch,
          tags: payload.companyTags || [],
          industries: payload.companyIndustries || [],
          regions: [],
        };
        logger.info('using_provided_company_data', { companyName: companyData.name });
      } else {
        const company = await fetchCompanyById(companyId);
        if (!company) {
          throw new Error(`Company not found: ${companyId}`);
        }
        companyData = {
          name: company.name,
          website: company.website || undefined,
          one_liner: company.one_liner || undefined,
          batch: company.batch || undefined,
          tags: Array.isArray(company.tags) ? company.tags : [],
          industries: Array.isArray(company.industries) ? company.industries : [],
          regions: Array.isArray(company.regions) ? company.regions : [],
        };
        logger.info('fetched_company_from_db', { companyName: companyData.name });
      }

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
      logger.info('generated_seed_query', { domain, queryText });

      const seedData = {
        name: companyData.name,
        website: companyData.website,
        description: companyData.one_liner,
        batch: companyData.batch,
        tags: companyData.tags,
        industries: companyData.industries,
      };

      metadata.set('currentStep', 'creating_research_run');

      const run = await createResearchRun({
        companyId,
        domain,
        config,
        seedData,
        triggerRunId: ctx.run.id,
        triggerIdempotencyKey: ctx.run.idempotencyKey || undefined,
        status: 'running',
        startedAt: new Date(),
      });

      logger.info('research_run_created', { runId: run.id, domain });

      metadata.set('currentStep', 'creating_search_query');
      metadata.set('runId', run.id);

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

      logger.info('executing_search', {
        provider: 'google',
        queryText,
        domain,
      });

      const response = await provider.search({
        query: queryText,
        platform: 'google',
        maxResults: 10,
      });

      logger.info('search_completed', {
        resultsCount: response.results.length,
        durationMs: Date.now() - queryStartTime,
      });

      const resultsJson = response.results.map((result, index) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        rank: result.rank || index + 1,
        metadata: result.metadata,
      }));
      // console.log(response.results);
      // console.log(resultsJson);
      logger.info('search_results_debug', {
        domain,
        queryText,
        results: resultsJson
      });

      metadata.set('currentStep', 'saving_results');

      await completeDiscovery({
        runId: run.id,
        queryId: query.id,
        queryStartedAt: new Date(queryStartTime),
        queryDurationMs: Date.now() - queryStartTime,
        resultsCount: response.results.length,
        resultsJson,
      });

      const totalDuration = Date.now() - startTime;

      metadata.set('status', 'completed');
      metadata.set('totalDurationMs', totalDuration);

      logger.info('discovery_completed', {
        runId: run.id,
        domain,
        durationMs: totalDuration,
        resultsCount: response.results.length,
      });

      return {
        runId: run.id,
        companyId,
        domain,
        status: 'completed',
        stats: {
          queriesExecuted: 1,
          sourcesDiscovered: response.results.length,
          durationMs: totalDuration,
          currentDepth: 0,
          budgetExhausted: false,
        },
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

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
        stats: {
          queriesExecuted: 0,
          sourcesDiscovered: 0,
          durationMs: Date.now() - startTime,
          currentDepth: 0,
          budgetExhausted: false,
        },
        error: {
          message: errorMessage,
          retryable: true,
        },
      };
    }
  },
});
