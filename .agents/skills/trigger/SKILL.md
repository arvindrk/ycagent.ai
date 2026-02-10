---
name: trigger-dev-v4
description: Comprehensive Trigger.dev v4 documentation covering basic tasks, advanced patterns, configuration, and realtime features. Use when implementing background jobs, task scheduling, workflow orchestration, realtime monitoring, or any Trigger.dev integration.
license: MIT
metadata:
    author: trigger.dev
    version: '4.0.0'
---

# Trigger.dev v4 Documentation

Complete reference for implementing Trigger.dev tasks, workflows, and realtime features in your application.

## When to Apply

Reference these guidelines when:

- Writing or modifying Trigger.dev tasks
- Implementing background job processing
- Setting up task scheduling and orchestration
- Configuring retry strategies and error handling
- Implementing realtime task monitoring
- Optimizing task performance and concurrency
- Setting up build configurations and extensions

## Documentation Structure

| File                 | Description                                                      | When to Use                              |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| `basic.mdc`          | Task definitions, triggering, waits, debouncing                  | Creating new tasks, triggering workflows |
| `advanced-tasks.mdc` | Tags, batching, concurrency, queues, error handling, idempotency | Complex workflows, performance tuning    |
| `config.mdc`         | Build extensions, Prisma, Python, Playwright, FFmpeg             | Project setup, adding integrations       |
| `realtime.mdc`       | Real-time monitoring, React hooks, streams                       | Building UI for task monitoring          |

## Quick Reference

### Basic Concepts

- **Task Definition**: Use `task()` from `@trigger.dev/sdk` (NOT `client.defineJob`)
- **Triggering**: Use `tasks.trigger()` or `myTask.trigger()` for execution
- **Waits**: Use `wait.for()`, `wait.until()`, `wait.forToken()` for delays
- **Result Handling**: `triggerAndWait()` returns Result object with `ok`, `output`, `error`

### Advanced Features

- **Tags**: Organize and filter runs with tags (max 10 per run)
- **Batching**: Trigger up to 1,000 tasks with `batchTrigger()`
- **Debouncing**: Consolidate rapid triggers with debounce keys
- **Concurrency**: Control parallel execution with queues
- **Idempotency**: Prevent duplicate execution with idempotency keys
- **Metadata**: Track progress with real-time updatable metadata

### Configuration

- **Build Extensions**: Prisma, Python, Playwright, FFmpeg, system packages
- **Machines**: Scale from micro (0.25 vCPU) to large-2x (8 vCPU)
- **Retry Strategies**: Exponential backoff, custom error handling
- **Environment Sync**: Dynamic environment variables per deployment

### Realtime

- **React Hooks**: `useRealtimeRun()`, `useTaskTrigger()`, `useRealtimeStream()`
- **Backend Subscriptions**: `runs.subscribeToRun()`, `runs.subscribeToRunsWithTag()`
- **Streams**: Define typed streams with `streams.define()`, pipe data with `stream.pipe()`
- **Authentication**: Public tokens for read/trigger access

## File Descriptions

### basic.mdc

Covers core task patterns:

- Task and schemaTask definitions
- Triggering from backend and within tasks
- Result handling with `triggerAndWait()`
- Wait operations (duration, date, token)
- Debouncing strategies (leading/trailing)

**Apply when**: Creating new tasks, implementing basic workflows

### advanced-tasks.mdc

Advanced patterns and features:

- Tags for organization and filtering
- Batch triggering (up to 1,000 items, 3MB each)
- Concurrency control with queues
- Error handling and retry strategies
- Machine presets for performance tuning
- Idempotency for critical operations
- Metadata and progress tracking
- Logging and tracing

**Apply when**: Optimizing performance, handling complex workflows, implementing production-grade features

### config.mdc

Build configuration and extensions:

- Basic trigger.config.ts setup
- Database integrations (Prisma, TypeORM)
- Scripting languages (Python)
- Browser automation (Playwright, Puppeteer)
- Media processing (FFmpeg, Audio Waveform)
- System packages (apt-get)
- Environment variable sync
- Custom build extensions

**Apply when**: Setting up projects, adding integrations, configuring build process

### realtime.mdc

Real-time monitoring and updates:

- Authentication with public tokens
- Backend run subscriptions
- React hooks for frontend integration
- Realtime streams v2 with type safety
- Wait token completion
- Run object properties and status

**Apply when**: Building UI for task monitoring, implementing real-time updates

## Best Practices

### Critical Patterns

1. **Always use SDK**: Import from `@trigger.dev/sdk`, never use v2 `client.defineJob`
2. **Handle Results**: Check `result.ok` before accessing `result.output`
3. **Type Safety**: Use `import type` for task references when triggering
4. **No Promise.all**: Don't wrap `triggerAndWait()` or `wait` calls in Promise.all

### Production Readiness

- Configure retry strategies with exponential backoff
- Use idempotency keys for payment/critical operations
- Implement proper error handling with `catchError`
- Track progress with metadata for long-running tasks
- Use queues to prevent overwhelming external services
- Match machine size to computational requirements

### Performance Optimization

- Use batch triggering for bulk operations
- Implement debouncing for user activity and webhooks
- Configure concurrency limits based on resource constraints
- Use after() for non-blocking operations
- Cache data with React.cache() and LRU caches

## Common Patterns

### Basic Task

```ts
import { task } from '@trigger.dev/sdk';

export const myTask = task({
    id: 'my-task',
    run: async (payload: { userId: string }) => {
        // Task logic
        return { processed: true };
    },
});
```

### Triggering with Result

```ts
const result = await myTask.triggerAndWait({ userId: '123' });
if (result.ok) {
    console.log(result.output);
} else {
    console.error(result.error);
}
```

### Batch Processing

```ts
await myTask.batchTrigger([
    { payload: { userId: '1' } },
    { payload: { userId: '2' } },
]);
```

### Realtime Monitoring

```tsx
const { run } = useRealtimeRun(runId, { accessToken });
return <div>Status: {run?.status}</div>;
```

## Full Documentation

For complete details, examples, and edge cases, consult the individual documentation files:

- `basic.mdc` - Core task patterns
- `advanced-tasks.mdc` - Advanced features
- `config.mdc` - Build configuration
- `realtime.mdc` - Real-time monitoring
