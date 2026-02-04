import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3';
import { companyDeepResearchPayloadSchema } from '@/lib/validations/deep-research.schema';
import type { DeepResearchStepResult } from '@/lib/validations/deep-research.schema';
import { YC_EXTRACTION_SCHEMA, YC_EXTRACTION_PROMPT } from '@/lib/validations/yc-extraction.schema';
import { discoveryAgent } from './discovery-agent';
import { getScraperProvider } from '@/lib/scraping/factory';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

async function executeStep<T>(
  stepNumber: number,
  stepName: string,
  fn: () => Promise<T>,
  buildSuccessData: (result: T) => Record<string, unknown>
): Promise<DeepResearchStepResult> {
  const startTime = Date.now();
  metadata.set('currentStep', stepNumber);
  metadata.set('currentStepName', stepName);

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;

    const stepResult: DeepResearchStepResult = {
      step: stepNumber,
      name: stepName,
      status: 'completed',
      data: buildSuccessData(result),
      timestamp: new Date().toISOString(),
      durationMs,
    };

    console.log(`   ✓ ${stepName} completed in ${(durationMs / 1000).toFixed(2)}s`);
    logger.info('step_completed', { step: stepNumber, name: stepName });
    return stepResult;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = getErrorMessage(error);

    const stepResult: DeepResearchStepResult = {
      step: stepNumber,
      name: stepName,
      status: 'failed',
      data: { error: errorMsg },
      timestamp: new Date().toISOString(),
      durationMs,
    };

    console.log(`   ✗ ${stepName} failed: ${errorMsg}`);
    logger.error('step_failed', { step: stepNumber, name: stepName, error: errorMsg });
    return stepResult;
  }
}

export const deepResearchOrchestrator = schemaTask({
  id: 'deep-research-orchestrator',
  schema: companyDeepResearchPayloadSchema,
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    const startTime = Date.now();
    const company = payload;
    const runId = ctx.run.id;

    console.log('\n🔬 [Orchestrator] Starting deep research');
    console.log(`   Company: ${company.name} (${company.id})`);
    console.log(`   Steps: ${company.source_url ? '2 (YC extraction + discovery)' : '1 (discovery only)'}`);
    console.log(`   Run ID: ${runId}\n`);

    logger.info('deep_research_started', {
      companyId: company.id,
      companyName: company.name,
      hasSourceUrl: !!company.source_url,
    });

    const totalSteps = company.source_url ? 2 : 1;
    metadata.set('status', 'in_progress');
    metadata.set('companyId', company.id);
    metadata.set('companyName', company.name);
    metadata.set('totalSteps', totalSteps);
    metadata.set('startedAt', new Date().toISOString());

    const steps: DeepResearchStepResult[] = [];
    let currentStep = 0;

    if (company.source_url) {
      console.log(`📄 [Step ${currentStep}] Extracting structured data from YC page`);
      steps.push(
        await executeStep(
          currentStep++,
          'YC Page Extract',
          async () => {
            const provider = getScraperProvider('firecrawl');
            const extractStartTime = Date.now();

            const result = await provider.extract(
              company.source_url!,
              YC_EXTRACTION_SCHEMA,
              YC_EXTRACTION_PROMPT
            );

            const extractDuration = Date.now() - extractStartTime;
            const extractedData = result.metadata?.structuredData;

            if (!extractedData) {
              throw new Error('YC extract returned no structured data');
            }

            console.log(`   [YC Extract] Retrieved structured data in ${extractDuration}ms`);
            console.log(`   📊 Extracted:`, JSON.stringify(extractedData, null, 2));

            return {
              url: company.source_url,
              extractedData,
              contentLength: result.contentLength,
              extractDurationMs: extractDuration,
              format: 'json',
            };
          },
          ({ url, extractedData, contentLength, extractDurationMs, format }) => ({
            url,
            extractedData,
            contentLength,
            extractDurationMs,
            format,
          })
        )
      );
    }

    console.log(`🔍 [Step ${currentStep}] Running discovery research`);
    steps.push(
      await executeStep(
        currentStep++,
        'Discovery Research',
        async () => {
          const result = await discoveryAgent.triggerAndWait({
            companyId: company.id,
            domain: 'founder_profile',
            companyName: company.name,
            companyWebsite: company.website || undefined,
            companyDescription: company.long_description || undefined,
            companyBatch: company.batch || undefined,
            companyTags: company.tags,
            config: {
              maxDepth: 0,
              maxBreadth: 2,
              maxQueries: 1,
              maxSources: 10,
              platforms: ['google'],
            },
          });
          if (!result.ok) throw new Error('Discovery task failed');
          return result.output;
        },
        (output) => ({
          domain: output.domain,
          discoveryResearch: {
            runId: output.runId,
            status: output.status,
            queriesExecuted: output.stats.queriesExecuted,
            sourcesDiscovered: output.stats.sourcesDiscovered,
            durationMs: output.stats.durationMs,
          },
        })
      )
    );

    const totalDuration = Date.now() - startTime;
    const completedAt = new Date().toISOString();
    const completedSteps = steps.filter((s) => s.status === 'completed').length;

    console.log(`\n✅ [Orchestrator] Deep research completed in ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Steps: ${completedSteps}/${totalSteps} successful`);
    steps.forEach((step, i) => {
      const icon = step.status === 'completed' ? '✓' : '✗';
      console.log(`   ${icon} Step ${i}: ${step.name} (${step.status})`);
    });
    console.log('');

    metadata.set('status', 'completed');
    metadata.set('completedAt', completedAt);
    metadata.set('totalDurationMs', totalDuration);

    logger.info('deep_research_completed', {
      companyId: company.id,
      totalDurationMs: totalDuration,
      successfulSteps: completedSteps,
      totalSteps,
    });

    return {
      companyId: company.id,
      companyName: company.name,
      steps,
      summary: `Completed ${completedSteps}/${totalSteps} deep research steps`,
      totalDurationMs: totalDuration,
      completedAt,
      cached: false,
    };
  },
});
