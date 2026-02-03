import { schemaTask, logger, metadata } from '@trigger.dev/sdk/v3';
import { companyDeepResearchPayloadSchema } from '@/lib/validations/deep-research.schema';
import type {
  DeepResearchStepResult,
  DeepResearchOutput,
} from '@/lib/validations/deep-research.schema';
import { discoveryTask } from './discovery-task';

export const deepResearchOrchestrator = schemaTask({
  id: 'deep-research-orchestrator',
  schema: companyDeepResearchPayloadSchema,
  maxDuration: 300,
  run: async (payload, { ctx }) => {
    const startTime = Date.now();
    const { companyId, companyName } = payload;

    logger.info('deep_research_started', { companyId, companyName });

    metadata.set('status', 'in_progress');
    metadata.set('companyId', companyId);
    metadata.set('companyName', companyName);
    metadata.set('totalSteps', 1);
    metadata.set('currentStep', 0);
    metadata.set('startedAt', new Date().toISOString());

    const stepResults: DeepResearchStepResult[] = [];

    const stepStartTime = Date.now();
    metadata.set('currentStep', 1);
    metadata.set('currentStepName', 'Discovery Research');

    try {
      const result = await discoveryTask.triggerAndWait({
        companyId: payload.companyId,
        domain: 'founder_profile',
        companyName: payload.companyName,
        companyWebsite: payload.companyWebsite,
        companyDescription: payload.companyDescription,
        companyBatch: payload.companyBatch,
        companyTags: payload.companyTags,
        config: {
          maxDepth: 0,
          maxBreadth: 2,
          maxQueries: 1,
          maxSources: 10,
          platforms: ['google'],
        },
      });

      if (!result.ok) {
        throw new Error(`Discovery task failed`);
      }

      const stepResult: DeepResearchStepResult = {
        step: 1,
        name: 'Discovery Research',
        status: 'completed',
        data: {
          domain: result.output.domain,
          discoveryResearch: {
            runId: result.output.runId,
            status: result.output.status,
            queriesExecuted: result.output.stats.queriesExecuted,
            sourcesDiscovered: result.output.stats.sourcesDiscovered,
            durationMs: result.output.stats.durationMs,
          },
        },
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - stepStartTime,
      };

      stepResults.push(stepResult);
      logger.info('step_completed', { step: 1, name: 'Discovery Research' });
    } catch (error) {
      const stepResult: DeepResearchStepResult = {
        step: 1,
        name: 'Discovery Research',
        status: 'failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - stepStartTime,
      };

      stepResults.push(stepResult);
      logger.error('step_failed', {
        step: 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const totalDuration = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const output: DeepResearchOutput = {
      companyId,
      companyName,
      steps: stepResults,
      summary: `Completed ${stepResults.filter((s) => s.status === 'completed').length}/1 deep research steps`,
      totalDurationMs: totalDuration,
      completedAt,
      cached: false,
    };

    metadata.set('status', 'completed');
    metadata.set('completedAt', completedAt);
    metadata.set('totalDurationMs', totalDuration);

    logger.info('deep_research_completed', {
      companyId,
      totalDurationMs: totalDuration,
      successfulSteps: stepResults.filter((s) => s.status === 'completed')
        .length,
    });

    return output;
  },
});
