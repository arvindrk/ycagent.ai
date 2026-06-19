---
name: ycagent-research-eval
description: Design and run lightweight evals for the YC company research agent. Use when changing Trigger.dev tasks, E2B browsing, LLM providers, source crawling, extraction, or synthesis.
---

1. Treat real external side effects as unsafe by default.
2. Prefer synthetic company fixtures and mocked providers for fast local checks.
3. Grade outcomes, not exact tool choices.
4. Rubrics should include source traceability, freshness, hallucination resistance, cancellation behavior, and bounded-runtime behavior.
5. Keep eval artifacts out of git unless they are stable fixtures.
