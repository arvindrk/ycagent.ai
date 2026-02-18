# YC Company Discovery & Research Platform

A candidate-focused discovery and research platform for the Y Combinator ecosystem.

**Status**: Active development · Core features implemented · Research agent operational

## What It Does

- **Explore** the YC company directory (5,600+ companies) with rich filtering
- **Search** naturally ("W24 B2B infra startups, small team, remote")
- **Research** any company on-demand via an autonomous agent that crawls public sources and returns evidence-backed dossiers on product positioning, team/founder signals, hiring activity, funding, and market presence — with full source traceability and freshness timestamps

### Research Agent

The agent runs as a background Trigger.dev task. It spins up an E2B Desktop sandbox with a persistent Chromium browser, then executes a multi-stage loop: **search → crawl → analyze → extract → synthesize**. All events stream to the frontend in real-time, including a live VNC view of the browser. Runs are budget-bounded (time, pages, domains) with diminishing-returns stopping rules and are cancellable at any time.

## Tech Stack

| Layer        | Stack                                                     |
| ------------ | --------------------------------------------------------- |
| Database     | Neon Postgres + pgvector (hybrid semantic/lexical search) |
| Jobs         | Trigger.dev v4 + E2B Desktop sandbox                      |
| AI           | Anthropic Claude (primary), Gemini, OpenAI                |
| Web Research | Serper, Playwright, Firecrawl                             |
| UI           | Next.js, Linear-inspired design system                    |

## Getting Started

**Prerequisites**: Bun 1.3.4+, Neon Postgres w/ pgvector, Trigger.dev account, API keys for E2B / Anthropic / Gemini / OpenAI / Firecrawl / Serper

```bash
bun install
cp env.example .env.local   # fill in API keys + DB URL
bun run db:migrate
bun run dev
# In separate terminal:
bunx trigger.dev@latest dev
```

Open http://localhost:3000

## Scripts

```bash
bun run dev / build / lint
bun run db:migrate / db:ingest-yc
bunx trigger.dev@latest dev / deploy
```

Built with ❤️ for the YC community
