# YC Company Discovery & Research Platform

> A candidate-focused discovery and research platform for the Y Combinator ecosystem.

**Status**: Active development • Core features implemented • Research agent operational

## Overview

This platform helps candidates explore the YC company universe, search it naturally, and generate deep research dossiers on demand. It combines structured YC data with on-demand web research to provide evidence-backed intelligence about companies, teams, products, and hiring signals.

## Tech Stack

### Database & Search

- **Neon Postgres** (serverless with connection pooling)
- **pgvector** extension for semantic search
- Hybrid search: semantic + lexical + name matching with tiered confidence results

### Background Jobs & Orchestration

- **Trigger.dev v4** for task orchestration and scheduling
- **E2B Desktop** for sandboxed browser automation
- Realtime streaming via Trigger streams (replaces SSE)

### AI & LLM

- **Multi-provider architecture**: Anthropic Claude (primary), Google Gemini, OpenAI
- Factory pattern for provider switching
- Streaming responses with tool use support
- OpenAI embeddings for semantic search

### Web Research

- **Firecrawl** for web scraping and content extraction
- **Serper** for Google search API
- **Playwright** for browser automation (via E2B)

### UI & Design

- Custom **Linear-inspired design system** with token-first architecture
- Dark mode support with next-themes

## Core User Journeys

### 1. Explore YC Companies

Browse the complete YC company directory with rich filtering:

- Batch (W24, S23, etc.)
- Location/region
- Stage (seed, Series A+, etc.)
- Industry and tags
- Hiring status
- Other YC attributes

### 2. Natural Language Search

Query the YC universe conversationally:

- "open source postgres vector database in SF"
- "W24 B2B infra startups, small team, remote"
- "companies building eval tooling for LLMs"

The system interprets intent, extracts constraints, and returns ranked results with explainable filtering.

### 3. On-Demand Deep Research

Trigger an autonomous research agent for any company that orchestrates multi-stage research workflows and crawls public sources to aggregate:

**Product & Positioning**

- Product positioning and value proposition
- Pricing and packaging
- Documentation maturity
- Security posture signals

**Team & Founders**

- Founder and team signals (proxy-based, evidence-backed)
- Investor participation and funding announcements
- Hiring signals (roles, recency, locations)

**Market Presence**

- Reputable third-party coverage (press, blogs, announcements)
- Community activity and developer adoption

**Transparency Guarantees**

- Sources attempted and results (success/failure/blocked)
- Freshness timestamps (last refreshed)
- Confidence levels and evidence tracing
- Captured artifacts (pages, screenshots, PDFs)

## Design Principles

### Budget-Bounded, Not Link-Bounded

No hard limits on links. Instead:

- Strict time, page, depth, and domain budgets
- Diminishing-returns stopping rules
- Per-domain rate limiting and concurrency caps

### Evidence-First Outputs

Every claim is traceable to captured artifacts. The platform prioritizes trustworthiness and debuggability over coverage.

### Caching & Incremental Refresh

- Research runs are user-triggered, not scheduled
- Heavy caching to minimize redundant work
- Incremental refresh using freshness windows (weekly-ish)
- Re-fetch only likely-to-change sources

### Politeness & Safety by Design

- Per-domain rate limiting
- Concurrency caps
- Scope policies (prefer reputable sources)
- Avoid uncontrolled crawling behavior

### Progressively Richer UX

- Start: strong observability for debugging
- Evolve: step-by-step agent trace UI (Manus-style)
- Driven by stored event logs and artifacts

## Research Agent Architecture

The deep research system uses **Trigger.dev v4** for background orchestration and **E2B Desktop** for sandboxed browser automation.

### Task Orchestration

**Research Orchestrator** (`research-orchestrator` task)

- Entry point for all research requests
- Creates E2B Desktop sandbox with persistent browser
- Triggers deep research agent as child task
- Aggregates and streams events to frontend
- Handles cancellation and cleanup

**Deep Research Agent** (`deep-research-agent` task)

- Connects to E2B Desktop sandbox
- Executes multi-LLM agent loop with tool use
- Streams events via Trigger streams (piped to parent)
- Budget-bounded execution (time, pages, domains)
- Automatic retries on failure

### Multi-Stage Research Workflow

1. **Search Phase**: Google search for company mentions and sources
2. **Crawl Phase**: Firecrawl extracts content from discovered URLs
3. **Analysis Phase**: LLM analyzes content for relevance and signals
4. **Extraction Phase**: Structured data extraction using Zod schemas
5. **Synthesis Phase**: Aggregate findings into research dossier

### LLM Provider Architecture

Factory pattern for swappable LLM providers:

- **Anthropic Claude** (primary): Agent reasoning and tool use
- **Google Gemini**: Alternative for high-throughput tasks
- **OpenAI GPT**: Embeddings and legacy support

All providers implement unified `Streamer` interface with tool calling support.

### Sandboxed Browser Automation

**E2B Desktop Sandbox**

- Isolated Ubuntu environment with Chromium browser
- VNC streaming for live observation (embedded in UI)
- Playwright automation for navigation and interaction
- Persistent across entire research run
- Automatic cleanup on completion or cancellation

### Budget Controls

- **Time budget**: 600s max task duration (configurable)
- **Domain budget**: Rate limiting per domain (politeness)
- **Concurrency**: Single-threaded research (parallel-ready architecture)
- **Stop conditions**: Diminishing returns detection, user cancellation

## Features & Implementation Status

### ✅ Fully Implemented

**Company Discovery**

- YC company directory with 5,600+ companies
- Company detail pages with rich metadata and taxonomy
- Batch-based browsing and pagination
- Company preview cards with Linear-styled UI

**Semantic Search**

- Hybrid search combining semantic, lexical, and name matching
- Tiered confidence results (High/Medium/Low)
- Natural language query interpretation
- Real-time search with debounced input
- Query explanation and result scoring

**Deep Research Agent**

- Background research orchestration via Trigger.dev
- Multi-stage workflow: search → crawl → analyze → extract
- E2B Desktop sandbox for safe browser automation
- Realtime streaming research UI with event timeline
- VNC desktop viewer for live browser observation
- Cancellable research runs (survives page refresh)

### 🔄 In Progress

- Research result caching and incremental refresh
- Research artifact storage (screenshots, PDFs, raw HTML)
- Founder profile extraction and entity recognition
- Evidence confidence scoring

### ⏸️ Planned (Not Started)

- Resume upload and candidate profiles
- Semantic candidate ↔ company matching
- Activity-based ranking and personalization
- Advanced authentication and role-based access
- Parallel research tasks (competitor analysis, market research)
- Research history and saved searches

## Getting Started

### Prerequisites

- **Bun 1.3.4+** (recommended) or Node.js 18+
- **Neon Postgres** database with pgvector extension
- **Trigger.dev** account (free tier available)
- **API keys**: E2B, Anthropic, Google Vertex, OpenAI, Firecrawl, Serper

### Setup

1. **Install dependencies:**

```bash
bun install
```

2. **Configure environment:**

```bash
cp env.example .env.local
# Edit .env.local with your API keys and database URL
```

3. **Run database migrations:**

```bash
bun run db:migrate
```

4. **Ingest YC companies** (optional, for fresh data):

```bash
bun run db:ingest-yc
```

5. **Start development server:**

```bash
bun run dev
```

6. **Start Trigger.dev dev server** (in separate terminal):

```bash
bunx trigger.dev@latest dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

**Getting API Keys:**

- **Neon**: [console.neon.tech](https://console.neon.tech) - Free tier includes pgvector
- **Trigger.dev**: [cloud.trigger.dev](https://cloud.trigger.dev) - Free tier available
- **E2B**: [e2b.dev](https://e2b.dev) - Sign up for Desktop sandbox access
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) - Claude API
- **Google Vertex**: [console.cloud.google.com](https://console.cloud.google.com) - Gemini API
- **OpenAI**: [platform.openai.com](https://platform.openai.com) - GPT + Embeddings
- **Firecrawl**: [firecrawl.dev](https://firecrawl.dev) - Web scraping API
- **Serper**: [serper.dev](https://serper.dev) - Google search API

### Available Scripts

**Development:**

```bash
bun run dev          # Start Next.js development server
bun run build        # Build for production
bun start            # Start production server
bun run lint         # Run ESLint
```

**Database:**

```bash
bun run db:migrate       # Run database migrations
bun run db:ingest-yc     # Ingest YC companies from API
bun run db:test          # Test database queries
```

**Testing:**

```bash
bun run test:search      # Test semantic search functionality
bun run test:crawler     # Test web crawler integration
```

**Trigger.dev:**

```bash
bunx trigger.dev@latest dev       # Start local Trigger dev server
bunx trigger.dev@latest deploy    # Deploy tasks to production
```

**Note**: If you prefer npm, all commands work with `npm run` instead of `bun run`.

## Support

For issues and questions:

1. Review Trigger.dev dashboard logs for task execution details
2. Check browser console for frontend errors
3. Verify environment variables are properly configured

---

Built with ❤️ for the YC community
