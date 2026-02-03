import { schemaTask, logger } from '@trigger.dev/sdk/v3';
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

export const discoveryTask = schemaTask({
  id: 'discovery-research',
  schema: discoveryTaskPayloadSchema,
  maxDuration: 600,
  run: async (payload, { ctx }): Promise<DiscoveryTaskOutput> => {
    const startTime = Date.now();
    const { companyId } = payload;

    logger.info('discovery_started', { companyId });

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
        };
        logger.info('fetched_company_from_db', { companyName: companyData.name });
      }

      const config = discoveryConfigSchema.parse({
        maxDepth: 0,
        maxBreadth: 1,
        maxQueries: 1,
        maxSources: 10,
        platforms: ['google'],
        ...payload.config,
      });

      const seedData = {
        name: companyData.name,
        website: companyData.website,
        description: companyData.one_liner,
        batch: companyData.batch,
        tags: companyData.tags,
        industries: companyData.industries,
      };

      const run = await createResearchRun({
        companyId,
        config,
        seedData,
        triggerRunId: ctx.run.id,
        triggerIdempotencyKey: ctx.run.idempotencyKey || undefined,
        status: 'running',
        startedAt: new Date(),
      });

      const queryText = `${companyData.name} product information`;
      const query = await createSearchQuery({
        runId: run.id,
        queryText,
        platform: 'google',
        depth: 0,
      });

      const queryStartTime = Date.now();
      const provider = getSearchProvider('google');
      const response = await provider.search({
        query: queryText,
        platform: 'google',
        maxResults: 10,
      });

      const resultsJson = response.results.map((result, index) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        rank: result.rank || index + 1,
        metadata: result.metadata,
      }));

      await completeDiscovery({
        runId: run.id,
        queryId: query.id,
        queryStartedAt: new Date(queryStartTime),
        queryDurationMs: Date.now() - queryStartTime,
        resultsCount: response.results.length,
        resultsJson,
      });

      const totalDuration = Date.now() - startTime;
      logger.info('discovery_completed', {
        runId: run.id,
        durationMs: totalDuration,
        resultsCount: response.results.length,
      });

      return {
        runId: run.id,
        companyId,
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

      logger.error('discovery_failed', {
        companyId,
        error: errorMessage,
      });

      return {
        runId: ctx.run.id,
        companyId,
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
