# YC Company Discovery & Research Platform

> A candidate-focused discovery and research platform for the Y Combinator ecosystem.

**Status**: Work in progress

## Overview

This platform helps candidates explore the YC company universe, search it naturally, and generate deep research dossiers on demand. It combines structured YC data with on-demand web research to provide evidence-backed intelligence about companies, teams, products, and hiring signals.

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

Trigger a research agent for any company that crawls public sources to aggregate:

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

## Current Scope (MVP)

✅ **Implemented/In Progress**

- YC directory ingestion and browsing
- Hybrid search (YC attributes + natural language)
- User-triggered research runs
- Progress tracking and observability
- Evidence collection and storage

**Upcoming**

- Resume upload and candidate profiles
- Semantic/lexical candidate ↔ company matching
- Activity-based ranking and personalization
- Advanced auth and role-based access

## Getting Started

### Prerequisites

- Node.js 18+
- Neon Postgres database
- API keys for: OpenAI, Firecrawl, Serper, Trigger.dev

### Setup

1. Clone and install dependencies:

```bash
npm install
```

2. Copy environment template and add your keys:

```bash
cp env.example .env.local
```

3. Run database migrations:

```bash
npm run db:migrate
```

4. Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

See `env.example` for required configuration:

- Database connection (Neon)
- OpenAI API key (embeddings)
- Firecrawl API key (web scraping)
- Serper API key (search)
- Trigger.dev credentials (background jobs)

## Documentation

- [Architecture](/.docs/architecture/ARCHITECTURE.md)
- [Database Setup](/README_DB_SETUP.md)
- [Discovery Module](/.docs/architecture/DISCOVERY_MODULE.md)
- [Search Architecture](/.docs/architecture/SEARCH_ARCHITECTURE.md)
