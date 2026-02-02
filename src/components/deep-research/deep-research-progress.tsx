"use client";

import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { deepResearchOrchestrator } from "@/trigger/deep-research-orchestrator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface DeepResearchProgressProps {
  runId: string;
  accessToken: string;
  onComplete?: (output: unknown) => void;
}

export function DeepResearchProgress({
  runId,
  accessToken,
  onComplete,
}: DeepResearchProgressProps) {
  const { run, error: runError } = useRealtimeRun<typeof deepResearchOrchestrator>(
    runId,
    {
      accessToken,
      onComplete: (completedRun) => {
        console.log("Deep research completed:", completedRun.output);
        onComplete?.(completedRun.output);
      },
    }
  );

  if (runError) {
    return (
      <Card variant="elevated" className="p-6">
        <div className="text-text-danger">
          <p className="text-base-semibold">Error</p>
          <p className="text-sm-regular mt-2">
            {runError?.message || "Unknown error occurred"}
          </p>
        </div>
      </Card>
    );
  }

  if (!run) {
    return (
      <Card variant="elevated" className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  const status = run.status;
  const progress = (run.metadata?.progress as number) || 0;
  const currentStep = (run.metadata?.currentStep as number) || 0;
  const totalSteps = (run.metadata?.totalSteps as number) || 5;
  const currentStepName = (run.metadata?.currentStepName as string) || "";
  const stepMessage = (run.metadata?.stepMessage as string) || "";
  const completedSteps = (run.metadata?.completedSteps as string[]) || [];
  const isCompleted = status === "COMPLETED";
  const isFailed = status === "FAILED" || status === "CRASHED";
  const isRunning = status === "EXECUTING";

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge className="bg-accent-primary text-text-primary">Completed</Badge>;
    }
    if (isFailed) {
      return <Badge className="bg-text-danger text-white">Failed</Badge>;
    }
    if (isRunning) {
      return <Badge className="bg-accent-secondary text-text-primary">Running</Badge>;
    }
    return <Badge className="bg-bg-tertiary text-text-secondary">Queued</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg-semibold text-text-primary">
              Deep Research Progress
            </h3>
            <p className="text-sm-regular text-text-secondary mt-1">
              {run.metadata?.companyName as string}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm-regular">
            <span className="text-text-secondary">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-text-primary font-medium">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-fast"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isRunning && (
            <div className="space-y-1">
              {currentStepName && (
                <p className="text-sm-regular text-text-secondary">
                  Current: {currentStepName}
                </p>
              )}
              {stepMessage && (
                <p className="text-xs-regular text-text-tertiary">
                  {stepMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {completedSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm-semibold text-text-primary">Completed Steps</h4>
            <div className="space-y-2">
              {completedSteps.map((stepName, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-xs-regular p-3 rounded-md bg-bg-tertiary border border-bg-quaternary"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center text-text-primary font-medium">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium">{stepName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCompleted && run.output && (
          <div className="space-y-3 pt-4 border-t border-bg-quaternary">
            <h4 className="text-sm-semibold text-text-primary">Results</h4>
            <div className="p-4 rounded-md bg-bg-tertiary border border-bg-quaternary">
              <p className="text-sm-regular text-text-secondary mb-3">
                {run.output.summary}
              </p>
              <div className="space-y-2">
                {Array.isArray(run.output.steps) && run.output.steps.map((step: { status: string; name: string; durationMs: number }, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${step.status === "completed"
                        ? "bg-accent-primary"
                        : "bg-text-danger"
                        }`}
                    />
                    <span className="text-xs-regular text-text-primary">
                      {step.name}
                    </span>
                    <span className="text-xs-regular text-text-tertiary">
                      ({step.durationMs}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <p className="text-sm-semibold text-text-danger">
              Deep research task failed
            </p>
            <p className="text-xs-regular text-text-secondary mt-1">
              Please try again or contact support if the issue persists.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
