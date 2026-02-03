# Discovery Module Architecture

**Version:** 1.1 (MVP Implementation)  
**Status:** In Implementation  
**Last Updated:** 2026-02-03

---

## ⚠️ MVP vs. Full Vision

**Current implementation focuses on MVP with simplified scope:**

| Feature                      | MVP Status     | Full Vision (Deferred)                 |
| ---------------------------- | -------------- | -------------------------------------- |
| **Table: `discovered_urls`** | ✅ Implemented | Renamed from `sources` for clarity     |
| **Per-run deduplication**    | ✅ Implemented | `UNIQUE(run_id, url_hash)`             |
| **Tool-agnostic scraping**   | ✅ Implemented | FireCrawl provider (swappable)         |
| **Parallel scraping**        | ✅ Implemented | `Promise.all` + `Promise.allSettled`   |
| **Error handling**           | ✅ Implemented | Transient vs. permanent classification |
| **Global deduplication**     | ❌ Deferred    | Cross-run content caching              |
| **LLM relevance scoring**    | ❌ Deferred    | Pre-scrape filtering                   |
| **Content deduplication**    | ❌ Deferred    | `content_hash` based                   |
| **Rate limiting**            | ❌ Deferred    | Domain-level throttling                |
| **Insights extraction**      | ❌ Deferred    | `insights` table + LLM                 |
| **Artifacts storage**        | ❌ Deferred    | `artifacts` table (screenshots, PDFs)  |
| **Recursive discovery**      | ❌ Deferred    | Followup query generation              |

**Rationale**: Start simple, validate core scraping workflow, iterate based on usage patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [System Context](#system-context)
3. [Database Schema](#database-schema)
4. [Component Architecture](#component-architecture)
5. [Data Flow](#data-flow)
6. [Crash Recovery](#crash-recovery)
7. [API Contracts](#api-contracts)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Future Extensions](#future-extensions)

---

## Overview

### Purpose

The Discovery Module is a recursive web research system that aggregates information about YC companies from multiple sources (Google, GitHub, LinkedIn, Twitter) using a budget-bounded, depth-first exploration strategy.

### Key Characteristics

- **Budget-bounded**: Hard limits on queries, sources, and time (no "max links" approach)
- **Evidence-first**: Every insight traceable to captured artifacts
- **Crash-resilient**: Write-as-you-go with full resumability
- **Platform-agnostic**: Supports arbitrary search platforms (not hardcoded to specific APIs)
- **Industry-agnostic**: Flexible JSONB metadata adapts to any company domain

### Design Principles

1. **Leverage Trigger.dev primitives**: Don't reinvent checkpointing, retries, idempotency
2. **Minimize denormalization**: Store counters for fast queries, compute everything else
3. **Progressive enhancement**: Start simple, add complexity (rate limiting, caching) as needed
4. **Evidence traceability**: Full lineage from seed → query → source → insight → followup

---

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                     Deep Research Orchestrator              │
│                                                             │
│  Step 1: Discovery Module ◄─── (this document)             │
│  Step 2: LinkedIn Profile Enrichment                       │
│  Step 3: GitHub Activity Analysis                          │
│  Step 4: Funding/VC Research                               │
│  Step 5: Team/Hiring Signals                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Input:  YC company seed data (name, website, description, batch, tags)
Output: Aggregated insights + evidence artifacts + query tree
```

### Integration Points

**Upstream**:

- Triggered by `deep-research-orchestrator.ts` via `triggerAndWait()`
- Receives YC company data from `companies` table

**Downstream**:

- Stores results in `research_runs` table
- Subsequent orchestrator steps consume `research_runs.output` JSONB

**External Dependencies**:

- Google Search API (Serper.dev or Google Custom Search)
- GitHub REST API
- OpenAI API (LLM filtering/extraction)
- Firecrawl MCP (scraping) or custom scraper

---

## Database Schema

### Design Principles

- **UUIDv7 for all primary keys**: Time-ordered UUIDs provide better index performance and enable efficient range queries
- **Write-as-you-go**: Every operation writes to DB immediately for crash resilience
- **Adjacency list for tree structure**: Enables efficient depth-level queries without full tree scans
- **JSONB for flexibility**: Config, seed_data, metadata adapt to any company/industry
- **Status-based resumption**: Simple queries like `WHERE status='pending'` enable crash recovery

### Entity Relationship Diagram

```
research_runs (1) ──┬─→ (N) search_queries
                    │         │
                    │         └─→ (N) discovered_urls
                    │                  │
                    │                  └─→ (N) insights (future)
                    │                           │
                    │                           └─→ (1) search_queries (followup, future)
                    │
                    └─→ (N) artifacts (future)

Note: insights and artifacts tables are deferred to future iterations.
MVP focuses on: research_runs → search_queries → discovered_urls
```

### Table Definitions

**UUID Strategy**: All tables use UUIDv7 for primary keys. UUIDv7 is time-ordered (lexicographically sortable by creation time), providing better database performance for:

- **Index efficiency**: Sequential IDs improve B-tree performance
- **Range queries**: Time-based filtering without separate timestamp indexes
- **Disk locality**: Related records stored physically closer on disk

**Prerequisites**: Migration file must include:

```sql
-- Enable UUIDv7 extension
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

-- All table IDs will use: id UUID PRIMARY KEY DEFAULT uuid_generate_v7()
```

#### `research_runs`

**Purpose**: Top-level orchestration state for a single discovery run.

```sql
CREATE TABLE research_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  -- Prevent company deletion if research runs exist

  -- Configuration (immutable after creation)
  config JSONB NOT NULL,
  -- Example: {
  --   "max_depth": 2,
  --   "max_breadth": 3,
  --   "max_queries": 50,
  --   "max_sources": 100,
  --   "timeout_seconds": 600,
  --   "platforms": ["google", "linkedin", "github"]
  -- }

  seed_data JSONB NOT NULL,
  -- Example: {
  --   "name": "Neon",
  --   "website": "https://neon.tech",
  --   "description": "Serverless Postgres",
  --   "batch": "W21",
  --   "tags": ["developer-tools", "database"]
  -- }

  -- Trigger.dev integration
  trigger_run_id TEXT UNIQUE,
  trigger_idempotency_key TEXT UNIQUE,

  -- Execution state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, running, completed, failed, cancelled

  current_depth INTEGER DEFAULT 0,
  -- Resume point: which depth level we're currently processing

  -- Budget tracking (updated incrementally as work progresses)
  queries_executed INTEGER DEFAULT 0,
  sources_discovered INTEGER DEFAULT 0,
  sources_scraped INTEGER DEFAULT 0,
  insights_extracted INTEGER DEFAULT 0,

  budget_exhausted BOOLEAN DEFAULT false,
  budget_exhausted_reason TEXT,

  -- Final output (only set on completion)
  output JSONB,
  -- Example: {
  --   "insights": [
  --     { "content": "...", "category": "funding", "confidence": 0.9 }
  --   ],
  --   "sources_by_category": { "product": 15, "founder": 8 },
  --   "query_tree_summary": { "total_queries": 42, "avg_depth": 1.5 }
  -- }

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_checkpoint_at TIMESTAMP,

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Freshness/caching
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  cache_hit BOOLEAN DEFAULT false
);

CREATE INDEX idx_research_runs_company_id ON research_runs(company_id);
CREATE INDEX idx_research_runs_status ON research_runs(status);
CREATE INDEX idx_research_runs_trigger_run ON research_runs(trigger_run_id);
CREATE INDEX idx_research_runs_fresh_cache
  ON research_runs(company_id, completed_at, status)
  WHERE status = 'completed' AND expires_at > NOW();
```

**Key Design Decisions**:

- `config` and `seed_data` are JSONB for flexibility (easy to add new platforms/params)
- `trigger_idempotency_key` prevents duplicate runs: `hash(company_id + config + seed_data)`
- `current_depth` enables resumption at specific depth level
- Counters updated atomically after each operation for accurate budget tracking
- `expires_at` supports 7-day cache TTL (configurable)

---

#### `search_queries`

**Purpose**: Recursive tree of search queries, representing the discovery exploration tree.

```sql
CREATE TABLE search_queries (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,

  -- Tree structure (adjacency list)
  parent_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
  -- NULL = root query (depth 0)

  depth INTEGER NOT NULL DEFAULT 0,
  -- 0 = initial query, 1 = first followup, 2 = second followup, etc.

  breadth_position INTEGER,
  -- Position among siblings (0, 1, 2 for breadth=3)

  -- Query details
  query_text TEXT NOT NULL,
  -- Example: "Neon database funding round"

  platform VARCHAR(50) NOT NULL,
  -- Values: google, linkedin, github, twitter, llm, perplexity

  -- Generation context
  context TEXT,
  -- Human-readable explanation of why this query was generated
  -- Example: "Found Series A mention in TechCrunch article"

  generated_from_insight_id UUID REFERENCES insights(id) ON DELETE SET NULL,
  -- If this query was generated from an insight, link to it
  -- Nulled if parent insight deleted (breaks circular reference)

  -- Execution state (for crash recovery)
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, executing, completed, failed, skipped, budget_exceeded

  execution_attempt INTEGER DEFAULT 0,
  -- How many times we've tried executing this query

  last_attempt_at TIMESTAMP,

  -- Results metadata
  results_count INTEGER DEFAULT 0,
  -- How many raw results returned from platform

  sources_selected_count INTEGER DEFAULT 0,
  -- How many topK sources selected after LLM filtering

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Error tracking
  error_message TEXT,
  is_retryable BOOLEAN DEFAULT true,

  CONSTRAINT check_query_status CHECK (
    status IN ('pending', 'executing', 'completed', 'failed', 'skipped', 'budget_exceeded')
  ),
  CONSTRAINT check_depth_non_negative CHECK (depth >= 0)
);

CREATE INDEX idx_search_queries_run_id ON search_queries(run_id);
CREATE INDEX idx_search_queries_parent_id ON search_queries(parent_id);
CREATE INDEX idx_search_queries_status ON search_queries(run_id, status);
CREATE INDEX idx_search_queries_next_work
  ON search_queries(run_id, depth, status, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_search_queries_tree
  ON search_queries(run_id, parent_id, depth);
```

**Key Design Decisions**:

- Adjacency list (not nested JSON) enables efficient "find all depth N queries" without full tree scan
- `status` field critical for crash recovery: resume by querying `WHERE status = 'pending'`
- `breadth_position` enables deterministic ordering when resuming
- `generated_from_insight_id` maintains evidence chain for debugging
- `execution_attempt` prevents infinite retry loops

**Query Tree Example**:

```
depth=0: "Neon database product info" (parent_id=NULL)
  │
  ├─ depth=1: "Neon Postgres architecture" (breadth_position=0)
  │    └─ depth=2: "Neon compute storage separation"
  │
  ├─ depth=1: "Neon pricing model" (breadth_position=1)
  │    └─ depth=2: "Neon free tier limits"
  │
  └─ depth=1: "Neon serverless features" (breadth_position=2)
       └─ depth=2: "Neon autoscaling benchmarks"
```

---

#### `discovered_urls`

**Purpose**: URLs discovered from search results with scraping lifecycle tracking.

**Table renamed from `sources` to `discovered_urls` for clarity** - better describes what it contains (URLs discovered during search).

**MVP Implementation**: Simplified schema focusing on essential fields only. Advanced features (LLM relevance scoring, content-based deduplication, domain rate limiting) deferred to future iterations.

```sql
CREATE TABLE discovered_urls (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,

  -- URL identity
  url TEXT NOT NULL,
  url_hash VARCHAR(64) NOT NULL,
  -- SHA256(url) for fast per-run deduplication

  -- Discovery metadata (from search results)
  title TEXT,
  snippet TEXT,
  rank INTEGER,
  -- Position in search results (1-10)

  discovered_at TIMESTAMP DEFAULT NOW(),

  -- Scraping lifecycle
  scrape_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: pending, scraping, scraped, failed, blocked, timeout

  scrape_attempt INTEGER DEFAULT 0,
  scraped_at TIMESTAMP,
  scrape_duration_ms INTEGER,

  -- Scraped content
  content TEXT,
  -- Cleaned markdown

  content_length INTEGER,

  -- Provider tracking (tool-agnostic design)
  scraper_provider VARCHAR(50),
  -- Values: 'firecrawl', 'puppeteer', 'playwright', etc.

  -- Error handling
  error_message TEXT,
  is_retryable BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Per-run deduplication (prevents scraping same URL twice in same run)
  CONSTRAINT unique_url_per_run UNIQUE(run_id, url_hash),

  CONSTRAINT check_scrape_status CHECK (
    scrape_status IN ('pending', 'scraping', 'scraped', 'failed', 'blocked', 'timeout')
  )
);

CREATE INDEX idx_discovered_urls_run_id ON discovered_urls(run_id);
CREATE INDEX idx_discovered_urls_query_id ON discovered_urls(query_id);
CREATE INDEX idx_discovered_urls_url_hash ON discovered_urls(url_hash);
CREATE INDEX idx_discovered_urls_pending
  ON discovered_urls(run_id, scrape_status, rank NULLS LAST)
  WHERE scrape_status = 'pending';
CREATE INDEX idx_discovered_urls_status
  ON discovered_urls(run_id, scrape_status);
```

**Key Design Decisions**:

- **Per-run deduplication only**: `UNIQUE(run_id, url_hash)` prevents re-scraping same URL within a run, but allows same URL across different runs (no global cache for MVP)
- **Tool-agnostic provider field**: `scraper_provider` enables swapping between FireCrawl, Puppeteer, Playwright, etc.
- **Simplified schema**: Removed complexity from original design (LLM scoring, content hashing, domain tracking) - focus on core scraping functionality
- **Status-based workflow**: Clear lifecycle from `pending` → `scraping` → `scraped`/`failed`

**Deferred Features** (not in MVP):

- ❌ LLM relevance scoring (`relevance_score`, `relevance_reasoning`, `selected`)
- ❌ Cross-run content deduplication (`content_hash`)
- ❌ Domain-based rate limiting (`domain` column)
- ❌ Raw HTML storage (`raw_html`)
- ❌ Source type classification (`source_type`)

**Lifecycle Flow** (MVP):

```
1. Search executes → discovered_urls inserted with scrape_status='pending'
2. Scraper picks up pending URLs → scrape_status='scraping'
3. On success → scrape_status='scraped', content populated
4. On error → scrape_status='failed', error_message populated
```

**Future Enhancements**:

- Global deduplication cache (separate `scraped_urls` table)
- LLM-based relevance filtering before scraping
- Content-based deduplication across runs
- Per-domain rate limiting

---

#### `insights` (Deferred to Future)

**Purpose**: Extracted learnings from scraped content, with flexible metadata.

**Status**: Not implemented in MVP. Future enhancement for insight extraction from scraped content.

```sql
-- FUTURE: Not in MVP
CREATE TABLE insights (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  discovered_url_id UUID NOT NULL REFERENCES discovered_urls(id) ON DELETE CASCADE,
  query_id UUID REFERENCES search_queries(id) ON DELETE SET NULL,

  -- Insight content
  content TEXT NOT NULL,
  -- Example: "Neon raised $46M Series B led by Menlo Ventures in October 2023"

  -- Flexible structured metadata (industry-agnostic)
  metadata JSONB,
  -- Examples:
  -- { "category": "funding", "amount": "$46M", "round": "Series B", "date": "2023-10", "lead_investor": "Menlo Ventures" }
  -- { "category": "founder", "name": "Nikita Shamgunov", "role": "CEO", "background": "ex-MemSQL" }
  -- { "category": "product", "feature": "branching", "description": "Git-like database branches" }
  -- { "category": "hiring", "role": "Senior Backend Engineer", "location": "Remote", "posted": "2024-01" }

  -- Evidence traceability
  evidence TEXT,
  -- Direct quote or snippet from source that supports this insight

  evidence_location TEXT,
  -- Where in source (xpath, section, line number)

  confidence DECIMAL(3,2),
  -- 0.00-1.00, LLM's confidence in extraction accuracy

  -- Follow-up query generation
  generated_followup BOOLEAN DEFAULT false,
  -- Did this insight generate a followup query?

  followup_query_id UUID REFERENCES search_queries(id) ON DELETE SET NULL,
  -- Link to generated followup query (nulled if followup query deleted)

  followup_generated_at TIMESTAMP,

  -- Deduplication
  content_hash VARCHAR(64),
  -- SHA256(content) to detect duplicate insights

  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent exact duplicate insights per run
  CONSTRAINT unique_insight_per_run UNIQUE(run_id, content_hash)
);

CREATE INDEX idx_insights_run_id ON insights(run_id);
CREATE INDEX idx_insights_source_id ON insights(source_id);
CREATE INDEX idx_insights_query_id ON insights(query_id);
CREATE INDEX idx_insights_metadata ON insights USING GIN(metadata jsonb_path_ops);
CREATE INDEX idx_insights_followup
  ON insights(run_id, generated_followup)
  WHERE generated_followup = true;
```

**Key Design Decisions**:

- `metadata` JSONB provides flexibility for any company/industry without schema changes
- `evidence` + `evidence_location` enable audit trail: "how did you conclude this?"
- `confidence` allows filtering low-quality extractions
- `followup_query_id` closes the loop: insight → followup query
- `content_hash` prevents duplicate insights from different sources saying same thing
- GIN index on `metadata` enables fast queries like "all funding insights" or "all founder insights"

**Metadata Schema Examples**:

```json
// Funding insight
{
  "category": "funding",
  "amount": "$46M",
  "round": "Series B",
  "date": "2023-10",
  "lead_investor": "Menlo Ventures",
  "other_investors": ["Khosla Ventures", "General Catalyst"]
}

// Founder insight
{
  "category": "founder",
  "name": "Nikita Shamgunov",
  "role": "CEO",
  "previous_company": "MemSQL",
  "education": "Lomonosov Moscow State University",
  "linkedin": "https://linkedin.com/in/nikitashamgunov"
}

// Product insight
{
  "category": "product_feature",
  "feature": "database branching",
  "description": "Git-like branches for Postgres databases",
  "launch_date": "2022-06",
  "pricing_tier": "pro"
}

// Hiring insight
{
  "category": "hiring",
  "role": "Senior Backend Engineer",
  "team": "Compute",
  "location": "Remote (US)",
  "posted_date": "2024-01-15",
  "apply_url": "https://neon.tech/careers"
}

// Competitor insight
{
  "category": "competitor",
  "competitor_name": "Supabase",
  "comparison_point": "Real-time features",
  "source_type": "reddit_discussion"
}
```

---

#### `artifacts` (Deferred to Future)

**Purpose**: Evidence storage (screenshots, PDFs, HTML snapshots).

**Status**: Not implemented in MVP. Future enhancement for storing additional evidence artifacts.

```sql
-- FUTURE: Not in MVP
CREATE TABLE artifacts (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
  discovered_url_id UUID REFERENCES discovered_urls(id) ON DELETE SET NULL,

  -- Artifact details
  artifact_type VARCHAR(50) NOT NULL,
  -- Values: screenshot, pdf, html_snapshot, github_readme, linkedin_screenshot

  storage_path TEXT NOT NULL,
  -- S3/R2/local path: e.g., "artifacts/run-123/source-456-screenshot.png"

  storage_url TEXT,
  -- Public URL if needed for frontend display

  -- Metadata
  file_size_bytes INTEGER,
  content_hash VARCHAR(64),
  -- SHA256 for deduplication across runs

  mime_type VARCHAR(100),

  -- Upload state (for async storage)
  upload_status VARCHAR(20) DEFAULT 'pending',
  -- Values: pending, uploading, uploaded, failed

  uploaded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_artifacts_run_id ON artifacts(run_id);
CREATE INDEX idx_artifacts_source_id ON artifacts(source_id);
CREATE INDEX idx_artifacts_content_hash ON artifacts(content_hash);
```

**Key Design Decisions**:

- Separate table allows async artifact generation (screenshot after scrape)
- `content_hash` enables deduplication: same webpage screenshot reused across runs
- `upload_status` tracks async upload to S3/R2
- `artifact_type` extensible for future evidence types (video, audio, API responses)

---

## Component Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Trigger.dev Task Layer                   │
│  (discoveryTask - orchestrates recursion, checkpointing)    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Query Generation Layer                    │
│  - seed-query-generator: initial queries from YC seed data  │
│  - followup-query-generator: queries from insights          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Search Execution Layer                   │
│  - google-search: Serper/Custom Search API                  │
│  - github-search: GitHub REST API                           │
│  - platform-factory: route to correct platform              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                      Filtering Layer                        │
│  - relevance-scorer: LLM scores results, selects topK       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                      Scraping Layer                         │
│  - scraper: Firecrawl MCP or custom scraper                 │
│  - content-cleaner: HTML → markdown                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                     Extraction Layer                        │
│  - insight-extractor: LLM extracts structured data          │
│  - followup-generator: generates next queries               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Aggregation Layer                        │
│  - insight-aggregator: merges, deduplicates insights        │
│  - output-formatter: JSONB output structure                 │
└─────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Database Query Layer                      │
│  - research.queries.ts: all DB operations                   │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── trigger/
│   └── discovery-task.ts              # Main Trigger.dev task
│
├── lib/
│   ├── discovery/
│   │   ├── query-generation/
│   │   │   ├── seed-query-generator.ts
│   │   │   └── followup-query-generator.ts
│   │   │
│   │   ├── search/
│   │   │   ├── google-search.ts
│   │   │   ├── github-search.ts
│   │   │   ├── platform-factory.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── filtering/
│   │   │   ├── relevance-scorer.ts
│   │   │   └── prompts.ts
│   │   │
│   │   ├── scraping/
│   │   │   ├── scraper.ts
│   │   │   ├── content-cleaner.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── extraction/
│   │   │   ├── insight-extractor.ts
│   │   │   ├── followup-generator.ts
│   │   │   └── prompts.ts
│   │   │
│   │   └── aggregation/
│   │       ├── insight-aggregator.ts
│   │       └── output-formatter.ts
│   │
│   ├── db/
│   │   └── queries/
│   │       └── research.queries.ts     # All DB operations
│   │
│   └── validations/
│       └── research.schema.ts          # Zod schemas
│
└── app/
    └── api/
        └── research/
            └── trigger/
                └── route.ts            # API route to trigger discovery
```

---

## Data Flow

### High-Level Flow

```
1. User clicks "Research" on company page
   ↓
2. API checks cache: recent run for this company?
   ↓ (if no cache)
3. API triggers discoveryTask via Trigger.dev
   ↓
4. discoveryTask creates research_run record
   ↓
5. For each depth level (0 → max_depth):
   a. Query Generation: generate queries from seed/insights
   b. Search Execution: execute queries in parallel (Promise.all)
   c. LLM Filtering: score results, select topK sources
   d. Scraping: scrape selected sources in parallel
   e. Extraction: extract insights + generate followup queries
   ↓
6. Aggregation: merge insights, deduplicate, format output
   ↓
7. Update research_run.output, mark status='completed'
   ↓
8. Return aggregated results to orchestrator
```

### Detailed Flow: Single Query Execution

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Query Generation                                          │
│    Input:  seed_data OR parent insight                       │
│    LLM:    "Generate 3 search queries for {company}"         │
│    Output: ["Neon funding", "Neon founders", "Neon product"] │
│    DB:     INSERT INTO search_queries (status='pending')     │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────┐
│ 2. Search Execution                                          │
│    Input:  query_text="Neon funding", platform="google"      │
│    API:    Serper.dev/Google Custom Search                   │
│    Output: [                                                 │
│      {url: "techcrunch.com/...", title: "...", snippet: "..."}│
│      {url: "crunchbase.com/...", title: "...", snippet: "..."}│
│      ...10 results                                           │
│    ]                                                         │
│    DB:     INSERT INTO discovered_urls (scrape_status='pending') │
│    DB:     UPDATE search_queries SET status='completed'      │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────┐
│ 3. LLM Filtering                                             │
│    Input:  10 sources + company context                      │
│    LLM:    Score each 0-1 for relevance                      │
│    Output: [                                                 │
│      {source_id: 1, score: 0.95, reasoning: "..."}           │
│      {source_id: 2, score: 0.87, reasoning: "..."}           │
│      {source_id: 3, score: 0.76, reasoning: "..."}           │
│      ...                                                     │
│    ]                                                         │
│    DB:     UPDATE sources SET                                │
│              relevance_score=X,                              │
│              selected=(rank <= topK),                        │
│              relevance_reasoning=Y                           │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────┐
│ 4. Scraping (topK sources only)                              │
│    Input:  sources WHERE selected=true                       │
│    Action: Firecrawl MCP OR custom scraper                   │
│    Output: {                                                 │
│      content: "TechCrunch article text...",                  │
│      raw_html: "<html>...</html>"                            │
│    }                                                         │
│    DB:     UPDATE sources SET                                │
│              scrape_status='scraped',                        │
│              content=...,                                    │
│              content_length=...,                             │
│              content_hash=SHA256(content)                    │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────┐
│ 5. Insight Extraction                                        │
│    Input:  source.content + company context                  │
│    LLM:    Extract structured insights                       │
│    Output: [                                                 │
│      {                                                       │
│        content: "Neon raised $46M Series B...",              │
│        metadata: {                                           │
│          category: "funding",                                │
│          amount: "$46M",                                     │
│          round: "Series B",                                  │
│          date: "2023-10"                                     │
│        },                                                    │
│        evidence: "direct quote from article",                │
│        confidence: 0.95                                      │
│      }                                                       │
│    ]                                                         │
│    DB:     INSERT INTO insights                              │
│            (content_hash=SHA256(content) for dedup)          │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────┴────────────────────────────────────┐
│ 6. Followup Generation (if depth < max_depth)               │
│    Input:  insight.content + insight.metadata                │
│    LLM:    Generate followup queries                         │
│    Output: [                                                 │
│      {                                                       │
│        query: "Menlo Ventures portfolio companies",          │
│        reasoning: "Found lead investor mention"              │
│      }                                                       │
│    ]                                                         │
│    DB:     INSERT INTO search_queries                        │
│              (parent_id=current_query_id,                    │
│               depth=current_depth+1,                         │
│               status='pending')                              │
│    DB:     UPDATE insights SET                               │
│              generated_followup=true,                        │
│              followup_query_id=...                           │
└──────────────────────────────────────────────────────────────┘
```

### Breadth-First Execution Order

```
Depth 0 (seed queries):
  Query 1: "Neon database funding" [google]
  Query 2: "Neon founders background" [linkedin]
  Query 3: "Neon github repository" [github]

  → Execute ALL depth 0 queries in parallel (Promise.all)
  → Scrape, extract, generate followups

Depth 1 (followups from depth 0):
  Query 4: "Menlo Ventures portfolio" [google]
  Query 5: "Nikita Shamgunov previous startups" [linkedin]
  Query 6: "Neon Postgres contributions" [github]

  → Execute ALL depth 1 queries in parallel (Promise.all)
  → Scrape, extract, generate followups

Depth 2 (followups from depth 1):
  Query 7: "Menlo Ventures investment strategy" [google]
  Query 8: "MemSQL acquisition history" [google]
  Query 9: "Postgres MVCC implementation" [github]

  → Execute ALL depth 2 queries in parallel (Promise.all)
  → Scrape, extract (no more followups, depth=max_depth)

Aggregation:
  Merge all insights, deduplicate, format output
```

---

## Crash Recovery

### Trigger.dev Built-in Checkpointing

Trigger.dev automatically checkpoints task state using CRIU (Checkpoint/Restore In Userspace):

- **When**: On `triggerAndWait()`, `wait.for()`, or any async boundary
- **What**: Full memory snapshot (variables, stack, heap)
- **Storage**: Compressed checkpoint stored on disk
- **Resume**: On task retry, restores exact state before failure

**What we DON'T need to implement**:

- Low-level state serialization
- Manual checkpoint saves
- Complex state restoration logic

**What we DO implement**:

- Business progress tracking (`current_depth`, counters)
- Work queue queries (`WHERE status='pending'`)
- Idempotency for operations

### Recovery Scenarios

#### Scenario 1: Task Crashes Mid-Query

```
State before crash:
  current_depth = 1
  queries_executed = 5
  search_queries:
    - id=1, depth=0, status='completed'
    - id=2, depth=0, status='completed'
    - id=3, depth=1, status='executing' ← crashed here
    - id=4, depth=1, status='pending'
    - id=5, depth=1, status='pending'

Recovery steps:
1. Trigger.dev retries task (automatic)
2. Task loads research_run state
3. Resume from current_depth=1
4. Query: SELECT * FROM search_queries
          WHERE run_id=X AND status='pending' AND depth=1
5. Returns: [id=3 (was 'executing', reset to 'pending'), id=4, id=5]
6. Execute pending queries
```

**Critical**: Mark query as `executing` atomically:

```sql
UPDATE search_queries
SET status='executing', started_at=NOW()
WHERE id=$1 AND status='pending'
RETURNING *
```

If this UPDATE returns 0 rows → query already executing or completed (another retry?) → skip it.

#### Scenario 2: Task Crashes During Parallel Execution

```
State before crash:
  Executing 3 queries in parallel (Promise.all):
    - Query A: completed
    - Query B: crashed (network timeout)
    - Query C: not started yet

Recovery steps:
1. Trigger.dev retries task
2. Query DB for pending queries at current depth
3. Finds: Query B (reset to 'pending'), Query C (still 'pending')
4. Re-executes both (Query A already 'completed', skipped)
```

**Idempotency guarantees**:

- Sources have UNIQUE constraint on `(run_id, url_hash)` → duplicate URLs ignored
- Insights have UNIQUE constraint on `(run_id, content_hash)` → duplicate insights ignored
- Queries check `status='pending'` before execution → completed queries skipped

#### Scenario 3: Budget Exhaustion Mid-Depth

```
State before exhaustion:
  config.max_queries = 50
  queries_executed = 48
  Depth 1 has 5 pending queries

Recovery steps:
1. Check budget: 48 executed, 2 remaining
2. Execute 2 queries
3. Before 3rd query: checkBudget() returns false
4. Mark remaining queries as status='budget_exceeded'
5. Mark run as budget_exhausted=true
6. Proceed to aggregation with partial results
```

**Budget checking**:

```typescript
async function checkBudget(runId: string): Promise<boolean> {
    const run = await db.query(
        `
    SELECT queries_executed, config->>'max_queries' as max_queries
    FROM research_runs WHERE id=$1
  `,
        [runId]
    );

    if (run.queries_executed >= parseInt(run.max_queries)) {
        await db.query(
            `
      UPDATE research_runs 
      SET budget_exhausted=true, budget_exhausted_reason='max_queries_reached'
      WHERE id=$1
    `,
            [runId]
        );
        return false;
    }

    return true;
}
```

### Database Transaction Strategy

**Per-operation transactions** (not long-running):

```typescript
async function executeQuery(query: SearchQuery) {
    // 1. Atomically mark as executing
    const updated = await db.query(
        `
    UPDATE search_queries 
    SET status='executing', started_at=NOW(), execution_attempt=execution_attempt+1
    WHERE id=$1 AND status='pending'
    RETURNING *
  `,
        [query.id]
    );

    if (updated.rowCount === 0) return; // Already being processed

    try {
        // 2. Execute search (external API, no transaction)
        const results = await searchPlatform(query.platform, query.query_text);

        // 3. Insert sources (idempotent via UNIQUE constraint)
        await db.query(
            `
      INSERT INTO sources (run_id, query_id, url, url_hash, ...)
      VALUES ($1, $2, $3, $4, ...)
      ON CONFLICT (run_id, url_hash) DO NOTHING
    `,
            [
                /* ... */
            ]
        );

        // 4. Increment counter + mark complete (atomic)
        await db.query(
            `
      BEGIN;
      UPDATE research_runs SET queries_executed=queries_executed+1 WHERE id=$1;
      UPDATE search_queries SET status='completed', completed_at=NOW() WHERE id=$2;
      COMMIT;
    `,
            [query.run_id, query.id]
        );
    } catch (error) {
        // 5. Mark as failed
        await db.query(
            `
      UPDATE search_queries SET status='failed', error_message=$2 WHERE id=$1
    `,
            [query.id, error.message]
        );
        throw error;
    }
}
```

**Why not long transactions?**

- External API calls (search, scrape, LLM) take 1-10 seconds
- Long transactions hold locks, block other operations
- Crash during external call → entire transaction rolled back, no progress saved

**Write-as-you-go strategy**:

- Each completed operation writes to DB immediately
- On crash, partial progress preserved
- Resume from last completed operation

---

## API Contracts

### Trigger.dev Task Contract

```typescript
// src/trigger/discovery-task.ts
import { schemaTask } from '@trigger.dev/sdk/v3';
import { z } from 'zod';

export const discoveryPayloadSchema = z.object({
    runId: z.string().uuid().optional(), // If resuming existing run
    companyId: z.string().uuid(),
    maxDepth: z.number().int().min(0).max(5).default(2),
    maxBreadth: z.number().int().min(1).max(10).default(3),
    maxQueries: z.number().int().min(1).max(200).default(50),
    maxSources: z.number().int().min(1).max(500).default(100),
    timeoutSeconds: z.number().int().min(60).max(1800).default(600),
    platforms: z
        .array(z.enum(['google', 'github', 'linkedin', 'twitter']))
        .default(['google', 'github']),
});

export type DiscoveryPayload = z.infer<typeof discoveryPayloadSchema>;

export const discoveryOutputSchema = z.object({
    runId: z.string().uuid(),
    companyId: z.string().uuid(),
    insights: z.array(
        z.object({
            content: z.string(),
            category: z.string(),
            confidence: z.number().min(0).max(1),
            evidence: z.string().optional(),
            metadata: z.record(z.unknown()),
        })
    ),
    stats: z.object({
        queriesExecuted: z.number(),
        sourcesDiscovered: z.number(),
        sourcesScraped: z.number(),
        insightsExtracted: z.number(),
        durationMs: z.number(),
        budgetExhausted: z.boolean(),
    }),
    queryTreeSummary: z.object({
        totalQueries: z.number(),
        queriesByDepth: z.record(z.string(), z.number()),
        avgResultsPerQuery: z.number(),
    }),
});

export type DiscoveryOutput = z.infer<typeof discoveryOutputSchema>;

export const discoveryTask = schemaTask({
    id: 'discovery-research',
    schema: discoveryPayloadSchema,
    maxDuration: 600,
    retry: {
        maxAttempts: 3,
        factor: 2,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 30_000,
        randomize: true,
    },
    run: async (payload, { ctx }): Promise<DiscoveryOutput> => {
        // Implementation
    },
});
```

### API Route Contract

```typescript
// src/app/api/research/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const triggerRequestSchema = z.object({
    companyId: z.string().uuid(),
    forceRefresh: z.boolean().default(false),
    maxDepth: z.number().int().min(0).max(5).optional(),
    maxBreadth: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { companyId, forceRefresh, ...config } =
        triggerRequestSchema.parse(body);

    // Check cache
    if (!forceRefresh) {
        const cached = await findRecentRun(companyId);
        if (cached) {
            return NextResponse.json({
                cached: true,
                runId: cached.id,
                output: cached.output,
            });
        }
    }

    // Trigger task
    const handle = await discoveryTask.trigger(
        {
            companyId,
            ...config,
        },
        {
            idempotencyKey: generateIdempotencyKey(companyId, config),
            idempotencyKeyTTL: '1h',
        }
    );

    return NextResponse.json({
        cached: false,
        runId: handle.id,
        triggerRunId: handle.id,
        status: 'triggered',
    });
}
```

### LLM Prompt Contracts

#### Relevance Scoring Prompt

```typescript
// src/lib/discovery/filtering/prompts.ts

export const relevanceScorePrompt = (
    company: Company,
    searchResults: SearchResult[]
) => `
You are evaluating search results for a YC company research project.

Company Context:
- Name: ${company.name}
- Description: ${company.description}
- Batch: ${company.batch}
- Tags: ${company.tags.join(', ')}

Search Results:
${searchResults
    .map(
        (r, i) => `
${i + 1}. ${r.title}
   URL: ${r.url}
   Snippet: ${r.snippet}
`
    )
    .join('\n')}

Task: Score each result from 0.0 to 1.0 based on relevance for discovering:
- Product information (features, pricing, tech stack)
- Founder backgrounds and team composition
- Funding rounds and investors
- Hiring signals and job openings
- Customer testimonials and case studies
- Competitive positioning

Return JSON array:
[
  {
    "rank": 1,
    "score": 0.95,
    "reasoning": "Direct coverage of Series B funding round with investor details"
  },
  ...
]

Rules:
- Official company sources (website, blog, docs) = 0.9-1.0
- High-authority news (TechCrunch, Bloomberg) = 0.8-0.9
- Industry analysis/reviews = 0.7-0.8
- Social media/forums = 0.5-0.7
- Unrelated content = 0.0-0.3
`;
```

#### Insight Extraction Prompt

```typescript
export const insightExtractionPrompt = (
    company: Company,
    content: string,
    sourceUrl: string
) => `
Extract structured insights from this source about ${company.name}.

Source URL: ${sourceUrl}
Content:
${content.slice(0, 10000)} // Truncate if too long

Extract insights in these categories:
1. **funding**: Funding rounds, amounts, investors, dates
2. **founder**: Founder names, backgrounds, roles, previous companies
3. **product**: Product features, pricing, tech stack, launch dates
4. **hiring**: Open roles, team growth, office locations
5. **customer**: Customer testimonials, case studies, usage stats
6. **competitor**: Competitor mentions, comparisons, market positioning

For each insight, provide:
- content: Clear, factual statement (1-2 sentences)
- category: One of the categories above
- metadata: Structured data (amounts, dates, names, etc.)
- evidence: Direct quote from source supporting this insight
- confidence: 0.0-1.0 based on evidence quality

Return JSON array:
[
  {
    "content": "Neon raised $46M Series B led by Menlo Ventures in October 2023",
    "category": "funding",
    "metadata": {
      "amount": "$46M",
      "round": "Series B",
      "lead_investor": "Menlo Ventures",
      "date": "2023-10",
      "other_investors": ["Khosla Ventures"]
    },
    "evidence": "exact quote from article supporting this",
    "confidence": 0.95
  }
]

Rules:
- Only extract verifiable facts with clear evidence
- No speculation or inference without explicit source support
- Include evidence quote for traceability
- Confidence < 0.6 if unclear/ambiguous
- Skip redundant information already well-known
`;
```

#### Followup Query Generation Prompt

```typescript
export const followupQueryPrompt = (insight: Insight, company: Company) => `
Given this insight about ${company.name}, generate follow-up search queries to deepen research.

Insight:
${insight.content}

Category: ${insight.category}
Metadata: ${JSON.stringify(insight.metadata, null, 2)}

Generate 1-3 follow-up queries that would:
- Verify this information from additional sources
- Discover related details (e.g., if funding mentioned, who are other portfolio companies of this investor?)
- Explore implications (e.g., if founder has previous startup, what happened to it?)

Return JSON array:
[
  {
    "query": "Menlo Ventures B2B SaaS investments 2023",
    "platform": "google",
    "reasoning": "Found lead investor mention, research their investment thesis"
  },
  {
    "query": "Khosla Ventures infrastructure startups",
    "platform": "google",
    "reasoning": "Other investor, understand their portfolio positioning"
  }
]

Available platforms: google, github, linkedin, twitter

Rules:
- Max 3 queries per insight
- Focus on high-value information gaps
- Prefer verifiable sources (no speculative queries)
- Skip if insight is already comprehensive
`;
```

---

## Error Handling

### Error Classification

| Error Type                | HTTP Status             | Retry Strategy                         | Example                            |
| ------------------------- | ----------------------- | -------------------------------------- | ---------------------------------- |
| **Transient**             | 429, 500, 502, 503, 504 | Exponential backoff (3 attempts)       | Rate limit, server overload        |
| **Permanent**             | 400, 401, 403, 404, 451 | Skip, mark as failed                   | Not found, forbidden, auth failure |
| **Timeout**               | N/A                     | Retry with longer timeout (2 attempts) | Network timeout, slow response     |
| **Captcha/Bot Detection** | 403 + body check        | Skip, flag for manual review           | Cloudflare challenge, reCAPTCHA    |
| **Budget Exhausted**      | N/A                     | Stop execution gracefully              | Max queries reached                |
| **LLM Failure**           | 500, 429                | Retry with backoff (3 attempts)        | OpenAI API error                   |

### Error Handling Flow

```typescript
async function executeQueryWithErrorHandling(query: SearchQuery) {
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
        try {
            await executeQuery(query);
            return;
        } catch (error) {
            attempt++;

            // Classify error
            const errorType = classifyError(error);

            switch (errorType) {
                case 'transient':
                    if (attempt < maxAttempts) {
                        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                        await wait.for({ seconds: delayMs / 1000 });
                        continue;
                    }
                    break;

                case 'permanent':
                    await markQueryFailed(query.id, error.message, false); // is_retryable=false
                    return;

                case 'captcha':
                    await markQueryFailed(
                        query.id,
                        'Bot detection triggered',
                        false
                    );
                    await flagForManualReview(query.id);
                    return;

                case 'budget':
                    await markQueryBudgetExceeded(query.id);
                    return;

                default:
                    // Unknown error, mark as failed after retries
                    if (attempt >= maxAttempts) {
                        await markQueryFailed(query.id, error.message, true); // is_retryable=true
                    }
            }
        }
    }
}

function classifyError(error: any): ErrorType {
    if (error.response) {
        const status = error.response.status;

        if ([429, 500, 502, 503, 504].includes(status)) {
            return 'transient';
        }

        if ([400, 401, 403, 404, 451].includes(status)) {
            if (status === 403 && error.response.body?.includes('captcha')) {
                return 'captcha';
            }
            return 'permanent';
        }
    }

    if (error.name === 'TimeoutError') {
        return 'timeout';
    }

    if (error.message.includes('budget')) {
        return 'budget';
    }

    return 'unknown';
}
```

### Error Propagation Strategy

**Query-level errors**: Don't fail entire run

```typescript
// Bad: entire run fails if one query fails
for (const query of queries) {
    await executeQuery(query); // throws → run fails
}

// Good: continue with other queries
await Promise.allSettled(queries.map((q) => executeQuery(q)));
// Check results, log failures, continue
```

**Critical errors**: Fail entire run

```typescript
// Database connection lost
if (error instanceof DatabaseConnectionError) {
    throw error; // Let Trigger.dev retry entire task
}

// Invalid configuration
if (error instanceof ConfigValidationError) {
    throw error; // Don't retry, invalid input
}
```

**Partial success**: Complete run with degraded results

```typescript
const results = await Promise.allSettled(queries.map(executeQuery));
const successful = results.filter((r) => r.status === 'fulfilled').length;
const failed = results.filter((r) => r.status === 'rejected').length;

logger.info(
    `Completed ${successful}/${queries.length} queries, ${failed} failed`
);

// Continue to aggregation with partial results
await aggregateInsights(runId); // Works with whatever we got
```

---

## Performance Considerations

### UUIDv7 Benefits

Time-ordered UUIDs provide measurable performance improvements:

**Index Performance**:

```sql
-- UUIDv7: Sequential inserts, minimal page splits
-- INSERT performance: ~20% faster than UUIDv4
-- Index size: ~15% smaller due to better compression

-- Range queries by creation time:
SELECT * FROM research_runs
WHERE id >= uuid_generate_v7_from_timestamp('2024-01-01')
  AND id < uuid_generate_v7_from_timestamp('2024-02-01');
-- No separate created_at index needed
```

**Write Performance**: Sequential IDs reduce B-tree page splits, improving insert throughput.  
**Read Performance**: Related records stored physically closer, reducing disk seeks.  
**Index Size**: Better compression for time-ordered data.

### Parallelization Strategy

**Parallelize at depth level** (not entire tree):

```typescript
// Good: All depth N queries execute in parallel
for (let depth = 0; depth <= maxDepth; depth++) {
    const queries = await findPendingQueries(runId, depth);
    await Promise.all(queries.map(executeQuery)); // Parallel within depth
}

// Bad: Depth 0 blocks depth 1 completely
for (let depth = 0; depth <= maxDepth; depth++) {
    const queries = await findPendingQueries(runId, depth);
    for (const query of queries) {
        await executeQuery(query); // Sequential within depth
    }
}
```

**Why depth-first, not fully parallel?**

- Depth 1 queries depend on insights from depth 0
- Can't generate followups until we've extracted insights
- Budget management easier (stop at any depth boundary)

### Database Query Optimization

**Use indexes for work queue queries**:

```sql
-- Finding next work: O(log n) with index
SELECT * FROM search_queries
WHERE run_id = $1 AND status = 'pending' AND depth = $2
ORDER BY created_at
LIMIT 10;

-- Without index: O(n) table scan
-- With idx_search_queries_next_work: O(log n) index scan
```

**Batch updates for counters**:

```typescript
// Bad: N updates for N queries
for (const query of queries) {
    await db.query(
        `UPDATE research_runs SET queries_executed = queries_executed + 1`
    );
}

// Good: Single update after batch
await db.query(
    `
  UPDATE research_runs 
  SET queries_executed = queries_executed + $2
  WHERE id = $1
`,
    [runId, queries.length]
);
```

**Use ON CONFLICT for idempotency**:

```sql
-- Idempotent insert (no error if duplicate)
INSERT INTO sources (run_id, query_id, url, url_hash, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (run_id, url_hash) DO NOTHING;

-- vs checking first (2 queries instead of 1)
const exists = await db.query(`SELECT 1 FROM sources WHERE url_hash = $1`, [hash]);
if (!exists) {
  await db.query(`INSERT INTO sources ...`);
}
```

### LLM API Optimization

**Batch LLM calls where possible**:

```typescript
// Bad: N LLM calls for N sources (slow, expensive)
for (const source of sources) {
    const score = await llm.scoreRelevance(company, [source]);
}

// Good: Single LLM call for all sources (fast, cheap)
const scores = await llm.scoreRelevance(company, sources);
```

**Use structured output mode** (JSON schema validation):

```typescript
const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: relevanceScorePrompt }],
    response_format: {
        type: 'json_schema',
        json_schema: {
            name: 'relevance_scores',
            schema: {
                type: 'object',
                properties: {
                    scores: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                rank: { type: 'number' },
                                score: { type: 'number' },
                                reasoning: { type: 'string' },
                            },
                            required: ['rank', 'score', 'reasoning'],
                        },
                    },
                },
            },
        },
    },
});
// Guaranteed valid JSON, no parsing errors
```

### Memory Management

**Stream large responses** (don't buffer entire HTML):

```typescript
// Bad: Load entire 5MB HTML into memory
const html = await fetch(url).then((r) => r.text());
const markdown = convertHtmlToMarkdown(html); // OOM for large pages

// Good: Stream and process chunks
const response = await fetch(url);
const stream = response.body.pipeThrough(new TextDecoderStream());
const markdown = await streamingConvert(stream);
```

**Limit content size**:

```typescript
const MAX_CONTENT_LENGTH = 50_000; // characters

if (scrapedContent.length > MAX_CONTENT_LENGTH) {
    // Truncate to first N chars + "..." indicator
    scrapedContent =
        scrapedContent.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated]';
}
```

---

## Future Extensions

### Phase 2: Rate Limiting (Deferred)

**Why deferred?**

- Adds significant complexity (per-domain state tracking)
- Most APIs have built-in rate limiting (fail fast with 429)
- Can start with conservative delays (1-2s between requests)
- Firecrawl MCP handles rate limiting internally

**When to add**:

- Observing frequent rate limit errors from specific domains
- Need to crawl high-volume domains (LinkedIn, Twitter)
- Cost optimization (avoid wasted API calls)

**Implementation sketch**:

```sql
CREATE TABLE rate_limit_state (
  domain VARCHAR(255) PRIMARY KEY,
  last_request_at TIMESTAMP,
  requests_in_window INTEGER DEFAULT 0,
  window_start_at TIMESTAMP DEFAULT NOW()
);

-- Before scraping
const canScrape = await checkRateLimit(domain);
if (!canScrape) {
  await wait.for({ seconds: delaySeconds });
}
await scrapeUrl(url);
await updateRateLimit(domain);
```

### Phase 3: Cross-Company Caching

**Scenario**: Company A and Company B are both in "B2B SaaS" → many shared search queries.

**Current**: Each company triggers independent discovery runs.

**Optimization**: Cache query results globally (not per-company).

```sql
CREATE TABLE query_cache (
  query_hash VARCHAR(64) PRIMARY KEY, -- SHA256(query_text + platform)
  query_text TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  cached_results JSONB, -- Top 10 search results
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  hit_count INTEGER DEFAULT 1
);

-- Before executing query
const cached = await db.query(`
  SELECT cached_results FROM query_cache
  WHERE query_hash = $1 AND expires_at > NOW()
`, [hash(query.query_text + query.platform)]);

if (cached) {
  // Reuse results, skip API call
  return cached.cached_results;
}
```

**Benefits**: Reduce API costs, faster execution.  
**Tradeoffs**: Staleness (7-day TTL), storage cost.

### Phase 4: Real-Time Streaming UI

**Current**: User polls API for run status.

**Enhancement**: Real-time updates via Trigger.dev Realtime Streams.

```typescript
// Frontend
import { useRealtimeRun } from '@trigger.dev/react-hooks';

function ResearchProgress({ runId }) {
  const { run } = useRealtimeRun(runId, { accessToken });

  const progress = run?.metadata?.currentDepth / run?.metadata?.maxDepth * 100;

  return (
    <div>
      <ProgressBar value={progress} />
      <p>Currently processing: {run?.metadata?.currentQuery}</p>
      <p>Insights extracted: {run?.metadata?.insightsExtracted}</p>
    </div>
  );
}

// Task
export const discoveryTask = schemaTask({
  // ...
  run: async (payload, { ctx }) => {
    for (let depth = 0; depth <= maxDepth; depth++) {
      metadata.set("currentDepth", depth);
      metadata.set("maxDepth", maxDepth);

      for (const query of queries) {
        metadata.set("currentQuery", query.query_text);
        await executeQuery(query);
        metadata.set("insightsExtracted", await countInsights(runId));
      }
    }
  }
});
```

### Phase 5: Multi-Domain Discovery

**Current**: Single run discovers all domains together.

**Enhancement**: Separate runs per domain (product, founder, funding, hiring).

```typescript
// Trigger 4 parallel discovery runs
await Promise.all([
    discoveryTask.trigger({ companyId, domain: 'product', maxDepth: 2 }),
    discoveryTask.trigger({ companyId, domain: 'founder', maxDepth: 1 }),
    discoveryTask.trigger({ companyId, domain: 'funding', maxDepth: 2 }),
    discoveryTask.trigger({ companyId, domain: 'hiring', maxDepth: 1 }),
]);
```

**Benefits**: Parallelism, focused queries, partial results available faster.  
**Tradeoffs**: More complexity, harder to aggregate insights across domains.

---

## Appendix

### Example Query Trees

#### Shallow Discovery (maxDepth=1, maxBreadth=2)

```
Run for: Neon (Serverless Postgres)

Depth 0 (seed queries):
├─ Q1: "Neon database product information" [google]
│  ├─ Source: neon.tech (selected, scraped)
│  │  └─ Insight: "Neon offers serverless Postgres with branching"
│  │     └─ Followup Q3: "Postgres branching implementation" [github]
│  └─ Source: techcrunch.com/neon-launch (selected, scraped)
│     └─ Insight: "Neon launched in June 2022 with $100M funding"
│        └─ Followup Q4: "Neon Series B investors" [google]
│
└─ Q2: "Neon founders background" [linkedin]
   ├─ Source: linkedin.com/nikita-shamgunov (selected, scraped)
   │  └─ Insight: "Nikita Shamgunov, CEO, ex-MemSQL"
   │     └─ Followup Q5: "MemSQL acquisition SingleStore" [google]
   └─ Source: crunchbase.com/neon (selected, scraped)
      └─ Insight: "Founded in 2021 by Nikita Shamgunov and Heikki Linnakangas"

Depth 1 (followup queries):
├─ Q3: "Postgres branching implementation" [github]
│  └─ Source: github.com/neondatabase/neon (selected, scraped)
│     └─ Insight: "Neon uses copy-on-write for instant branches"
│
├─ Q4: "Neon Series B investors" [google]
│  └─ Source: techcrunch.com/neon-series-b (selected, scraped)
│     └─ Insight: "Menlo Ventures led $46M Series B in October 2023"
│
└─ Q5: "MemSQL acquisition SingleStore" [google]
   └─ Source: singlestore.com/about (selected, scraped)
      └─ Insight: "MemSQL rebranded to SingleStore in September 2020"

Total: 5 queries, 7 sources scraped, 7 insights extracted
```

#### Deep Discovery (maxDepth=2, maxBreadth=3)

```
Run for: Anthropic (AI Safety & Research)

Depth 0:
├─ Q1: "Anthropic Claude product information" [google]
│  └─ Insights: Claude 3 models, API pricing, constitutional AI
│     └─ Followups: Q4, Q5, Q6
│
├─ Q2: "Anthropic founders background" [linkedin]
│  └─ Insights: Dario Amodei (CEO), Daniela Amodei (President), ex-OpenAI
│     └─ Followups: Q7, Q8, Q9
│
└─ Q3: "Anthropic funding history" [google]
│  └─ Insights: Series C $450M Google, total $7B+
│     └─ Followups: Q10, Q11, Q12

Depth 1:
├─ Q4: "Claude 3 Opus benchmarks" [google]
├─ Q5: "Constitutional AI research paper" [github]
├─ Q6: "Anthropic API rate limits" [google]
├─ Q7: "Dario Amodei OpenAI research" [google]
├─ Q8: "Daniela Amodei previous roles" [linkedin]
├─ Q9: "OpenAI safety team exodus 2021" [google]
├─ Q10: "Google Anthropic partnership details" [google]
├─ Q11: "Anthropic Series C investor list" [crunchbase]
└─ Q12: "AI safety lab funding landscape" [google]

Depth 2:
├─ Q13: "GPT-4 vs Claude 3 comparison" (from Q4)
├─ Q14: "RLHF constitutional AI differences" (from Q5)
├─ Q15: "Anthropic enterprise API pricing" (from Q6)
├─ ... (9 more queries from depth 1 followups)

Total: 24 queries, 45 sources scraped, 62 insights extracted
```

### SQL Query Examples

**Find all pending queries at current depth**:

```sql
SELECT * FROM search_queries
WHERE run_id = 'abc-123'
  AND status = 'pending'
  AND depth = 1
ORDER BY breadth_position;
```

**Get run statistics**:

```sql
SELECT
  r.queries_executed,
  r.sources_discovered,
  r.sources_scraped,
  r.insights_extracted,
  (SELECT COUNT(*) FROM search_queries WHERE run_id = r.id) as total_queries,
  (SELECT COUNT(*) FROM sources WHERE run_id = r.id AND selected = true) as topk_sources,
  (SELECT COUNT(*) FROM insights WHERE run_id = r.id) as total_insights
FROM research_runs r
WHERE r.id = 'abc-123';
```

**Find insights by category**:

```sql
SELECT content, metadata, confidence
FROM insights
WHERE run_id = 'abc-123'
  AND metadata->>'category' = 'funding'
ORDER BY confidence DESC;
```

**Find query tree (recursive CTE)**:

```sql
WITH RECURSIVE query_tree AS (
  -- Base case: root queries (depth 0)
  SELECT id, parent_id, depth, query_text, status, 0 as level
  FROM search_queries
  WHERE run_id = 'abc-123' AND parent_id IS NULL

  UNION ALL

  -- Recursive case: children
  SELECT q.id, q.parent_id, q.depth, q.query_text, q.status, qt.level + 1
  FROM search_queries q
  JOIN query_tree qt ON q.parent_id = qt.id
)
SELECT * FROM query_tree
ORDER BY level, depth, id;
```

**Find sources with failed scrapes**:

```sql
SELECT url, scrape_status, error_message, scrape_attempt
FROM sources
WHERE run_id = 'abc-123'
  AND scrape_status = 'failed'
  AND is_retryable = true
ORDER BY scrape_attempt;
```

**Cache lookup (find recent run for company)**:

```sql
SELECT id, output, completed_at
FROM research_runs
WHERE company_id = 'company-456'
  AND status = 'completed'
  AND expires_at > NOW()
ORDER BY completed_at DESC
LIMIT 1;
```

---

## References

- [Trigger.dev v4 Documentation](https://trigger.dev/docs)
- [Neon Serverless Postgres](https://neon.tech/docs)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Firecrawl MCP](https://github.com/mendableai/firecrawl)
- [React Best Practices (Vercel)](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)

---

**Document Status**: Ready for implementation  
**Next Steps**: Phase 1 (Database setup)
