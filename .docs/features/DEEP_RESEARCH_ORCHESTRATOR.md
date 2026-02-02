# Deep Research Orchestrator - Implementation Guide

## Overview

A complete idempotency-first deep research orchestration system built with Trigger.dev v4 that:

- ✅ Runs 5 simulated deep research steps (5 seconds each)
- ✅ Uses idempotency keys to cache results (30-day TTL)
- ✅ Updates metadata in real-time for progress tracking
- ✅ Streams live progress to frontend via Realtime API
- ✅ Handles retries with step-level idempotency (skips completed steps)
- ✅ Provides rich UI components for progress visualization

## Architecture

```
API Request → /api/deep-research/trigger → Trigger.dev Task → Realtime Updates → Frontend UI
                                            ↓
                                  Idempotency Key Cache
                                  (30-day result cache)
```

## Files Created

### 1. Validation Schema

**Path:** `src/lib/validations/deep-research.schema.ts`

Defines TypeScript types and Zod schemas for:

- Company deep research payload
- Deep research step results
- Final deep research output

### 2. Trigger.dev Task

**Path:** `src/trigger/deep-research-orchestrator.ts`

Core orchestration task with:

- 5 deep research steps (website analysis, market data, competitor landscape, customer reviews, insights report)
- Idempotency key: `deep-research_${companyId}` (cached for 30 days)
- Step-level wait idempotency (retries skip completed waits)
- Real-time metadata updates after each step
- Comprehensive error handling and logging

**Key Features:**

- **Retry Strategy:** 3 attempts with exponential backoff
- **Max Duration:** 300 seconds (5 minutes)
- **Wait Duration:** 5 seconds per step (total ~25 seconds)
- **Metadata Updates:** Progress, current step, completed steps, status

### 3. API Endpoints

#### Trigger Endpoint

**Path:** `src/app/api/deep-research/trigger/route.ts`

**Request:**

```json
POST /api/deep-research/trigger
{
  "company": {
    "companyId": "uuid",
    "companyName": "Acme Corp",
    "companyWebsite": "https://acme.com",
    "companyDescription": "...",
    "companyBatch": "W24",
    "companyTags": ["ai", "b2b"]
  },
  "forceRefresh": false
}
```

**Response:**

```json
{
    "success": true,
    "runId": "run_xyz",
    "publicAccessToken": "ptr_abc",
    "idempotencyKey": "deep-research_uuid",
    "message": "Deep Research task triggered successfully"
}
```

**Behavior:**

- `forceRefresh: false` (default): Uses idempotency key `deep-research_${companyId}` (returns cached result if exists)
- `forceRefresh: true`: Adds timestamp to key, forces new deep research run

#### Status Endpoint

**Path:** `src/app/api/deep-research/status/route.ts`

**Request:**

```
GET /api/deep-research/status?runId=run_xyz
```

**Response:**

```json
{
  "success": true,
  "run": {
    "id": "run_xyz",
    "status": "COMPLETED",
    "metadata": { ... },
    "output": { ... },
    "createdAt": "...",
    "completedAt": "..."
  }
}
```

### 4. Frontend Components

#### Research Container

**Path:** `src/components/deep-research/deep-research-container.tsx`

Main container component that:

- Manages state for runId and accessToken
- Renders trigger button and progress display
- Handles deep research completion callbacks

**Usage:**

```tsx
import { DeepResearchContainer } from '@/components/deep-research/deep-research-container';

<DeepResearchContainer company={companyData} />;
```

#### Trigger Button

**Path:** `src/components/deep-research/deep-research-trigger-button.tsx`

Button component that:

- Triggers deep research via API
- Shows loading state
- Handles errors
- Disables when deep research is in progress

#### Progress Display

**Path:** `src/components/deep-research/deep-research-progress.tsx`

Real-time progress component with:

- Live status updates via `useRealtimeRun` hook
- Progress bar (0-100%)
- Current step indicator
- Activity log of completed steps
- Final results display when complete
- Error handling and retry prompts

**UI States:**

- 🔵 **Queued:** Task waiting to start
- 🟢 **Running:** Active deep research with live progress
- ✅ **Completed:** Shows final results
- ❌ **Failed:** Error message with details

## How It Works

### Idempotency Strategy

1. **Task-Level Idempotency:** Same `companyId` returns same run handle
    - Key format: `deep-research_${companyId}`
    - TTL: 30 days (configurable)
    - Subsequent triggers return existing run (completed or in-progress)

2. **Step-Level Idempotency:** Retries skip completed steps
    - Each wait has its own idempotency key: `step-${stepNum}-wait`
    - TTL: 1 hour
    - On retry: Already-completed waits are skipped instantly

### Real-time Updates

**Metadata tracked:**

- `status`: "in_progress" | "completed" | "failed"
- `progress`: 0-100 percentage
- `currentStep`: 1-5
- `currentStepName`: Name of active step
- `stepMessage`: Current activity description
- `completedSteps`: Array of completed step names
- `totalSteps`: 5
- `companyId`, `companyName`, `startedAt`, `completedAt`

**Frontend subscription:**

```tsx
const { run } = useRealtimeRun(runId, { accessToken });
// run.metadata updates automatically on every metadata change
```

## Usage Examples

### Example 1: Trigger Deep Research from Company Detail Page

```tsx
// app/companies/[id]/page.tsx
import { DeepResearchContainer } from '@/components/deep-research/deep-research-container';
import { getCompany } from '@/lib/data/companies/get-company';

export default async function CompanyPage({
    params,
}: {
    params: { id: string };
}) {
    const company = await getCompany(params.id);

    return (
        <div>
            <h1>{company.name}</h1>
            <DeepResearchContainer company={company} />
        </div>
    );
}
```

### Example 2: Programmatic Trigger from API

```typescript
// app/api/batch-deep-research/route.ts
import { tasks } from '@trigger.dev/sdk/v3';
import type { deepResearchOrchestrator } from '@/trigger/deep-research-orchestrator';

export async function POST(req: Request) {
    const { companyIds } = await req.json();

    const handles = await Promise.all(
        companyIds.map((id: string) =>
            tasks.trigger<typeof deepResearchOrchestrator>(
                'deep-research-orchestrator',
                {
                    companyId: id,
                    companyName: 'Company Name',
                    // ... other fields
                },
                {
                    idempotencyKey: `deep-research_${id}`,
                    tags: [`batch:automated`, `company:${id}`],
                }
            )
        )
    );

    return Response.json({ runs: handles });
}
```

### Example 3: Server-Side Status Check

```typescript
import { runs } from '@trigger.dev/sdk/v3';
import type { deepResearchOrchestrator } from '@/trigger/deep-research-orchestrator';

const run = await runs.retrieve<typeof deepResearchOrchestrator>(runId);

if (run.status === 'COMPLETED') {
    console.log('Deep research results:', run.output);
}
```

## Environment Setup

### Required Environment Variables

```bash
# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_xxx  # From Trigger.dev dashboard

# Optional: For React hooks (set automatically by API)
# TRIGGER_PUBLIC_API_KEY is not needed - publicAccessToken is returned per-run
```

### Install Dependencies

Already installed:

- `@trigger.dev/sdk` (v3/v4)
- `@trigger.dev/react-hooks`

## Development Workflow

### 1. Start Trigger.dev Dev Server

```bash
npx trigger.dev@latest dev
```

This watches `src/trigger/` for changes and syncs tasks.

### 2. Test the Task

```bash
# Via Trigger.dev dashboard UI
# Navigate to: https://cloud.trigger.dev/projects/YOUR_PROJECT/test

# Or trigger via API:
curl -X POST http://localhost:3000/api/deep-research/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "companyName": "Test Company"
    }
  }'
```

### 3. Monitor Progress

Open the returned `runId` in Trigger.dev dashboard to see:

- Live logs
- Metadata updates
- Execution timeline
- Retry attempts

## Edge Cases Handled

### 1. Duplicate Requests

**Scenario:** Two API requests for same company arrive simultaneously

**Solution:**

- Both requests use same idempotency key
- Trigger.dev returns same run handle to both
- Frontend subscribes to same run
- Only one execution occurs

### 2. Task Retry Mid-Execution

**Scenario:** Task fails at step 3, retries

**Solution:**

- Step 1-2 waits are skipped (idempotency)
- Execution resumes at step 3
- Total time: ~15 seconds (3 remaining steps) instead of 25 seconds

### 3. Client Disconnection

**Scenario:** User closes browser during research

**Solution:**

- Task continues running (backend)
- On reconnect, use `/api/deep-research/status?runId=...` to get current state
- Subscribe with same runId to resume live updates

### 4. Idempotency Key Expiration

**Scenario:** 30 days pass, same company requested again

**Solution:**

- Idempotency key expired, new research starts
- Consider: Add `forceRefresh` parameter or adjust TTL

### 5. Force Refresh

**Scenario:** User wants fresh data despite cached result

**Solution:**

```typescript
{
  "company": { ... },
  "forceRefresh": true  // Adds timestamp to key
}
```

## Monitoring & Debugging

### Check Run Status

```bash
# Via Trigger.dev dashboard
https://cloud.trigger.dev/projects/YOUR_PROJECT/runs/run_xyz

# Via API
curl http://localhost:3000/api/deep-research/status?runId=run_xyz
```

### View Logs

All logs include structured context:

```typescript
logger.info('Step completed', {
    companyId,
    stepNum,
    durationMs,
});
```

### Metadata Inspection

Real-time metadata visible in:

- Trigger.dev dashboard (Run Details > Metadata tab)
- Frontend component (`run.metadata`)
- API response (`/api/deep-research/status`)

## Performance Characteristics

| Metric                           | Value                                      |
| -------------------------------- | ------------------------------------------ |
| **First Run**                    | ~25 seconds (5 steps × 5 seconds)          |
| **Cached Run**                   | <1 second (idempotency hit)                |
| **Retry (after step 3 failure)** | ~10 seconds (2 remaining steps)            |
| **Concurrent Requests**          | No limit (idempotency prevents duplicates) |
| **Result Cache Duration**        | 30 days (configurable)                     |

## Scaling Considerations

### Current Limitations (No Database)

- ❌ Can't list "all research for company X"
- ❌ Can't invalidate cache early (must wait for TTL expiry)
- ❌ No historical data beyond 30 days
- ❌ Can't query "research status for all companies in batch W24"

### Future Enhancements (With Database)

- ✅ Persist results permanently
- ✅ Query historical research
- ✅ Invalidate cache on-demand
- ✅ Analytics and reporting
- ✅ Resume from specific step (more granular checkpointing)

## Troubleshooting

### Issue: "Task not found"

**Cause:** Trigger.dev dev server not running or task not synced

**Fix:**

```bash
npx trigger.dev@latest dev
# Wait for "Tasks synced" message
```

### Issue: "Invalid access token"

**Cause:** `publicAccessToken` expired or incorrect

**Fix:**

- Tokens are scoped to specific runs
- Use the `publicAccessToken` returned from trigger API
- Tokens expire after run completion + TTL

### Issue: Metadata not updating in UI

**Cause:** React hooks not re-rendering

**Fix:**

- Ensure `useRealtimeRun` hook is called with correct `accessToken`
- Check browser console for websocket errors
- Verify Trigger.dev Realtime is enabled for your project

## Next Steps

1. **Add Database Persistence** (see `ARCHITECTURE.md` for DB schema)
2. **Implement Real Research Steps** (replace simulated actions)
3. **Add Filtering & Search** (query research results)
4. **Error Recovery UI** (manual retry button)
5. **Batch Operations** (research multiple companies)
6. **Webhooks** (notify on completion)

---

**Project:** YC Agent AI  
**Documentation Version:** 1.0  
**Last Updated:** 2026-01-31
