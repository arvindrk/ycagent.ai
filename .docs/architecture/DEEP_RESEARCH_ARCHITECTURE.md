# Deep Research Orchestrator - Complete Architecture

**YC Agent AI - Deep Research System v2.0**

## Executive Summary

A production-grade, polymorphic deep research orchestration system built on Trigger.dev v4 that supports multiple discovery methods (search, crawl, API) and extracts both unstructured and structured insights. Designed to scale to 100k+ companies with full observability, cost tracking, and graceful degradation.

**Key Capabilities:**

- ✅ Multi-domain research (VC, Founder, Product, Team, Community, etc.)
- ✅ Polymorphic source discovery (search, crawl, API, manual)
- ✅ Recursive query generation with progressive refinement
- ✅ Budget enforcement (time, pages, cost)
- ✅ Graceful failure handling with compensation logic
- ✅ Real-time progress streaming to frontend
- ✅ Complete artifact and evidence traceability
- ✅ Structured and unstructured insight extraction
- ✅ Cross-domain deduplication and source tracking

---

## Table of Contents

- [I. System Overview](#i-system-overview)
- [II. Core Concepts](#ii-core-concepts)
- [III. Database Schema](#iii-database-schema)
- [IV. Domain Types & Workflows](#iv-domain-types--workflows)
- [V. Execution Patterns](#v-execution-patterns)
- [VI. Budget Management](#vi-budget-management)
- [VII. Query Patterns](#vii-query-patterns)
- [VIII. Scaling Strategy](#viii-scaling-strategy)
- [IX. Cost Model](#ix-cost-model)
- [X. Observability](#x-observability)
- [XI. Migration Path](#xi-migration-path)

---

## I. System Overview

### A. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
│                  (Company ID + Domain Selection)                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Orchestrator Task (Trigger.dev)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  For each domain (sequential):                            │  │
│  │    1. Query Generation (LLM - progressive)                │  │
│  │    2. Search Execution (polymorphic)                      │  │
│  │    3. Item Evaluation (LLM filtering)                     │  │
│  │    4. Scraping (parallel, with retry)                     │  │
│  │    5. Insight Extraction (LLM)                            │  │
│  │    6. Budget Check & Compensation                         │  │
│  │    7. Recursion (if depth budget remains)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Central PostgreSQL Store                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │    Runs      │   Domains    │   Queries    │  Searches    │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │    Items     │   Scrapes    │   Insights   │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Real-Time Metadata Streaming (Frontend)             │
│           Progress, Insights, Failures, Budget Status            │
└─────────────────────────────────────────────────────────────────┘
```

### B. Design Principles

1. **Polymorphism First**: Single schema supports search, crawl, API, and manual sources
2. **Write-as-you-go**: Direct DB writes for observability and resume capability (no batching/caching in Phase 1)
3. **Simplicity Over Optimization**: Optimize external API usage (75% of runtime), not DB access (2-3%)
4. **Progressive Refinement**: LLM-guided query generation based on accumulated insights
5. **Graceful Degradation**: Partial success is valid; failures don't cascade
6. **Budget-Bounded**: Strict time/page/cost limits prevent runaway execution
7. **Evidence Traceability**: Every insight links back to source artifact
8. **Scale-Ready**: Designed for 100k+ companies with partitioning and indexing strategy (Phase 6+)

**Core 7 Tables**: `runs`, `domains`, `queries`, `searches`, `items`, `scrapes`, `insights`

---

## II. Core Concepts

### A. Research Domains

**Definition**: High-level research categories, each with specific goals and source strategies.

**Supported Domains**:

1. **VC Profile**: Investor credibility, portfolio, funding participation
2. **Founder Profile**: Background, serial entrepreneur status, contact info, LinkedIn activity
3. **Financials**: Funding rounds, valuations, investors, revenue signals
4. **Team Profile**: Size, education, previous companies, ex-founders
5. **Product Info**: Pricing, docs, changelog, open source status, GitHub links
6. **Community Presence**: Social media, Discord, YouTube, Reddit sentiment
7. **Customer Profile**: Customer logos, case studies, testimonials
8. **Company Events**: Conferences, meetups, Luma events
9. **Jobs**: Open roles, hiring velocity, LinkedIn postings
10. **3rd Party Info**: Product Hunt, Hacker News, TechCrunch, press coverage
11. **Similar Companies**: Competitors, alternative products
12. **Contact Sales**: Sales contact methods, demo links

### B. Source Types (Polymorphic)

| Source Type | Discovery Method    | Use Cases                       | API/Tool            |
| ----------- | ------------------- | ------------------------------- | ------------------- |
| `search`    | Search engine query | VC info, funding rounds, press  | Serper API          |
| `crawl`     | Website crawling    | Product pages, pricing, docs    | Firecrawl map/crawl |
| `api`       | Structured API call | GitHub repos, LinkedIn profiles | Native APIs         |
| `manual`    | Predefined URL list | Known community links           | N/A                 |

### C. Query Tree Structure

**Recursive Tree**:

- **Depth**: How many levels of follow-up queries (0, 1, 2)
- **Breadth**: How many queries per level (1-5 typical)
- **Compensation**: One-time additional query if >50% failures

```
Root Query (depth=0)
├── Query 1 (depth=1, breadth_position=1)
│   ├── Query 1.1 (depth=2)
│   └── Query 1.2 (depth=2)
├── Query 2 (depth=1, breadth_position=2)
│   ├── Query 2.1 (depth=2)
│   └── Query 2.2 (depth=2)
└── Query 3 (depth=1, breadth_position=3)
    ├── Query 3.1 (depth=2)
    └── Query 3.2 (depth=2)
```

### D. Budget Model

**Three-tier budget enforcement**:

1. **Run-level**: Global limits across all domains
    - `time_budget_seconds`: 300 (5 minutes default)
    - `page_budget`: 100 pages
    - `cost_budget_usd`: $10.00

2. **Domain-level**: Allocated subset of global budget
    - Dynamic allocation based on domain complexity
    - Example: VC Profile gets 25%, Founder gets 20%, etc.

3. **Query-level**: Tracked per query for compensation logic
    - No hard limits, but used for failure analysis

**Budget consumption rules**:

- Time: All retry attempts count
- Pages: Only successful scrapes count
- Cost: All API calls count (search, filter, scrape, extract)

---

## III. Database Schema

### A. UUIDv7 Implementation

All primary keys use UUIDv7 for time-series sortability:

```sql
-- Enable UUIDv7 extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom function for UUIDv7 generation (time-ordered)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    unix_ts_ms := (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;

    -- 48 bits of timestamp + 12 bits random + 62 bits random
    uuid_bytes := (
        decode(
            lpad(to_hex(unix_ts_ms), 12, '0') ||
            encode(gen_random_bytes(10), 'hex'),
            'hex'
        )
    );

    -- Set version (7) and variant bits
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

    RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql;
```

**Benefits of UUIDv7**:

- Time-ordered (sortable by creation time)
- Globally unique
- Better B-tree index performance vs UUIDv4
- Reveals chronological relationships without timestamp column

### B. Enum Types

```sql
-- Source discovery types
CREATE TYPE source_type AS ENUM (
  'search',      -- Serper, Google, Brave API
  'crawl',       -- Firecrawl map/crawl
  'api',         -- GitHub, LinkedIn, structured APIs
  'manual'       -- Predefined URL list
);

-- Discovered item types
CREATE TYPE item_type AS ENUM (
  'search_result',   -- From search engine
  'crawled_page',    -- From sitemap/crawl
  'api_response',    -- From API call
  'manual_entry'     -- Manually specified
);

-- Scraping methods
CREATE TYPE scrape_method AS ENUM (
  'firecrawl_scrape',  -- Firecrawl scrape API
  'firecrawl_crawl',   -- Firecrawl crawl API
  'api_fetch',         -- Direct API call (no scraping)
  'browser',           -- Browser automation (future)
  'none'               -- No scrape needed (data already structured)
);

-- Scrape status
CREATE TYPE scrape_status AS ENUM (
  'pending',
  'in_progress',
  'retrying',
  'success',
  'failed',
  'invalid',           -- Paywalled/blocked
  'skipped'            -- Filtered out
);

-- Insight types
CREATE TYPE insight_type AS ENUM (
  'text',              -- Unstructured text insight
  'structured',        -- JSON structured data
  'metric',            -- Single metric/KPI
  'list',              -- Array of items
  'evidence'           -- Supporting evidence/quote
);

-- Execution status
CREATE TYPE execution_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial',           -- Some items succeeded
  'compensated'        -- Triggered compensation
);
```

### C. Core Tables

#### 1. Runs Table

```sql
CREATE TABLE runs (
  run_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  company_id UUID NOT NULL REFERENCES companies(id),

  status execution_status NOT NULL DEFAULT 'pending',

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_duration_ms BIGINT,

  -- Budget tracking
  time_budget_seconds INT NOT NULL DEFAULT 300,
  time_used_seconds INT NOT NULL DEFAULT 0,
  page_budget INT NOT NULL DEFAULT 100,
  pages_scraped INT NOT NULL DEFAULT 0,
  cost_budget_usd DECIMAL(10, 4) DEFAULT 10.0000,
  total_cost_usd DECIMAL(10, 4) DEFAULT 0,

  -- Metadata
  config JSONB, -- {"depth": 2, "breadth": 3, "domains": ["vc_profile", "founder_profile"]}
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_runs_company ON runs(company_id);
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX idx_runs_company_status ON runs(company_id, status);
```

#### 2. Domains Table

```sql
CREATE TABLE domains (
  domain_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL, -- 'vc_profile', 'founder_profile', 'product_info'
  display_name VARCHAR(200), -- 'VC Profile', 'Product Information'
  execution_order INT NOT NULL,

  status execution_status NOT NULL DEFAULT 'pending',

  -- Budget allocation
  time_budget_seconds INT,
  time_used_seconds INT NOT NULL DEFAULT 0,
  page_budget INT,
  pages_scraped INT NOT NULL DEFAULT 0,
  cost_budget_usd DECIMAL(10, 4),
  cost_usd DECIMAL(10, 4) DEFAULT 0,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Stats
  total_queries INT NOT NULL DEFAULT 0,
  successful_queries INT NOT NULL DEFAULT 0,
  total_insights INT NOT NULL DEFAULT 0,

  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_domains_run ON domains(run_id);
CREATE INDEX idx_domains_status ON domains(status);
CREATE INDEX idx_domains_name ON domains(name);
CREATE INDEX idx_domains_run_order ON domains(run_id, execution_order);
```

#### 3. Queries Table

```sql
CREATE TABLE queries (
  query_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  domain_id UUID NOT NULL REFERENCES domains(domain_id) ON DELETE CASCADE,

  -- Tree structure
  parent_query_id UUID REFERENCES queries(query_id),
  depth INT NOT NULL DEFAULT 0,
  breadth_position INT, -- 1, 2, 3 for breadth=3

  query_text TEXT NOT NULL,
  query_context TEXT, -- Context passed to LLM for generation

  status execution_status NOT NULL DEFAULT 'pending',

  -- Compensation tracking
  is_compensation BOOLEAN NOT NULL DEFAULT FALSE,
  compensation_reason TEXT,

  -- Execution timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms BIGINT,

  -- Stats
  total_sources INT NOT NULL DEFAULT 0,
  successful_scrapes INT NOT NULL DEFAULT 0,
  failed_scrapes INT NOT NULL DEFAULT 0,
  total_insights INT NOT NULL DEFAULT 0,

  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_queries_domain ON queries(domain_id);
CREATE INDEX idx_queries_parent ON queries(parent_query_id);
CREATE INDEX idx_queries_depth ON queries(depth);
CREATE INDEX idx_queries_status ON queries(status);
CREATE INDEX idx_queries_compensation ON queries(is_compensation) WHERE is_compensation = TRUE;
CREATE INDEX idx_queries_domain_depth ON queries(domain_id, depth);
```

#### 4. Searches Table (Polymorphic)

```sql
CREATE TABLE searches (
  search_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  query_id UUID NOT NULL REFERENCES queries(query_id) ON DELETE CASCADE,

  source_type source_type NOT NULL,

  -- Source configuration (polymorphic)
  source_config JSONB NOT NULL,
  /*
  Search example:
  {
    "search_engine": "serper",
    "search_text": "Acme Corp funding rounds",
    "location": "us",
    "num_results": 10
  }

  Crawl example:
  {
    "root_url": "https://acme.com",
    "discovery_method": "firecrawl_map",
    "include_patterns": ["/blog/*", "/docs/*", "/pricing"],
    "exclude_patterns": ["/admin/*"],
    "max_depth": 3,
    "max_pages": 50
  }

  API example:
  {
    "provider": "github",
    "endpoint": "/repos/acme/product",
    "query_params": {"include": "contributors,stats"},
    "auth_required": true
  }

  Manual example:
  {
    "urls": [
      "https://reddit.com/r/acme",
      "https://discord.gg/acme",
      "https://youtube.com/@acme"
    ],
    "reason": "known_community_links"
  }
  */

  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms BIGINT,

  -- Results
  total_items_discovered INT NOT NULL DEFAULT 0,
  items_selected_for_scraping INT NOT NULL DEFAULT 0,

  -- Related searches (for search type)
  related_searches JSONB, -- ["query1", "query2", ...]

  -- Cost tracking
  api_credits_used DECIMAL(10, 4) DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0,

  -- Raw response (debugging)
  raw_response JSONB,

  status execution_status NOT NULL DEFAULT 'pending',
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_searches_query ON searches(query_id);
CREATE INDEX idx_searches_type ON searches(source_type);
CREATE INDEX idx_searches_status ON searches(status);
CREATE INDEX idx_searches_executed ON searches(executed_at DESC);

-- JSONB indexes for filtering
CREATE INDEX idx_search_config_search_engine
  ON searches((source_config->>'search_engine'))
  WHERE source_type = 'search';

CREATE INDEX idx_search_config_api_provider
  ON searches((source_config->>'provider'))
  WHERE source_type = 'api';
```

#### 5. Items Table (Polymorphic)

```sql
CREATE TABLE items (
  item_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  search_id UUID NOT NULL REFERENCES searches(search_id) ON DELETE CASCADE,

  item_type item_type NOT NULL,

  -- Common fields
  url TEXT, -- Can be null for pure API responses
  domain VARCHAR(255),
  title TEXT,
  snippet TEXT,

  -- Search-specific
  position INT, -- Position in search results
  published_date DATE,

  -- Item metadata (polymorphic)
  metadata JSONB,
  /*
  Search result example:
  {
    "sitelinks": [{"title": "Pricing", "url": "..."}],
    "imageUrl": "...",
    "breadcrumbs": [...]
  }

  Crawled page example:
  {
    "page_category": "pricing",
    "discovered_via": "sitemap",
    "parent_url": "...",
    "depth": 2
  }

  API response example:
  {
    "stars": 15000,
    "forks": 2000,
    "language": "TypeScript",
    "contributors_count": 150,
    "is_open_source": true
  }
  */

  -- LLM Evaluation
  llm_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ,
  evaluation_model VARCHAR(50), -- 'gpt-4o-mini'

  relevance_score DECIMAL(3, 2), -- 0.00-1.00
  relevance_rationale TEXT,

  should_scrape BOOLEAN NOT NULL DEFAULT FALSE,
  filter_reasons JSONB, -- ["high_relevance", "authoritative_domain"]

  evaluation_cost_usd DECIMAL(10, 6) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_items_search ON items(search_id);
CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_domain ON items(domain);
CREATE INDEX idx_items_should_scrape ON items(should_scrape)
  WHERE should_scrape = TRUE;
CREATE INDEX idx_items_evaluated ON items(llm_evaluated);
CREATE INDEX idx_items_score ON items(relevance_score DESC)
  WHERE relevance_score IS NOT NULL;

-- JSONB index for metadata queries
CREATE INDEX idx_items_metadata_category
  ON items((metadata->>'page_category'))
  WHERE item_type = 'crawled_page';
```

#### 6. Scrapes Table

```sql
CREATE TABLE scrapes (
  scrape_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  query_id UUID NOT NULL REFERENCES queries(query_id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(item_id),

  url TEXT NOT NULL,
  domain VARCHAR(255) NOT NULL, -- Denormalized for fast filtering

  scrape_method scrape_method NOT NULL DEFAULT 'firecrawl_scrape',
  status scrape_status NOT NULL DEFAULT 'pending',

  -- Retry tracking
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  proxy_mode VARCHAR(20), -- 'basic', 'stealth', 'auto'

  -- Content
  content_hash VARCHAR(64), -- SHA-256 of content
  content_length INT,
  content_format VARCHAR(20), -- 'markdown', 'html', 'json'

  -- Timing
  started_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ,
  duration_ms BIGINT,

  -- Error handling
  error_details JSONB,
  /*
  {
    "attempt_1": {"proxy": "basic", "error": "403", "timestamp": "..."},
    "attempt_2": {"proxy": "stealth", "error": "timeout", "timestamp": "..."},
    "attempt_3": {"proxy": "stealth", "error": "paywall_detected", "timestamp": "..."}
  }
  */

  invalid_reason VARCHAR(100), -- 'paywall', 'auth_required', 'captcha', 'timeout'

  -- Firecrawl specific
  firecrawl_cache_hit BOOLEAN DEFAULT FALSE,
  firecrawl_cost_usd DECIMAL(10, 6) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scrapes_query ON scrapes(query_id);
CREATE INDEX idx_scrapes_item ON scrapes(item_id);
CREATE INDEX idx_scrapes_domain ON scrapes(domain);
CREATE INDEX idx_scrapes_status ON scrapes(status);
CREATE INDEX idx_scrapes_url_hash ON scrapes USING hash(url);
CREATE INDEX idx_scrapes_query_status ON scrapes(query_id, status);
CREATE INDEX idx_scrapes_domain_status ON scrapes(domain, status);
```

#### 7. Insights Table

```sql
CREATE TABLE insights (
  insight_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  scrape_id UUID NOT NULL REFERENCES scrapes(scrape_id) ON DELETE CASCADE,

  insight_type insight_type NOT NULL DEFAULT 'text',

  -- Unstructured insight
  insight_text TEXT,

  -- Structured insight
  structured_data JSONB,
  /*
  Team profile example:
  {
    "team_size": 45,
    "team_schools": {"Stanford": 12, "MIT": 8, "Berkeley": 5},
    "ex_founders_count": 3,
    "avg_years_experience": 8.5
  }

  Product info example:
  {
    "pricing_model": "usage_based",
    "has_free_tier": true,
    "pricing_tiers": [...],
    "is_open_source": false,
    "github_url": null
  }

  Metric example:
  {
    "metric_name": "github_stars",
    "value": 15000,
    "timestamp": "2026-02-01",
    "trend": "increasing"
  }
  */

  extraction_schema VARCHAR(100), -- 'team_profile_v1', 'pricing_v1'

  -- Source info (denormalized)
  source_url TEXT NOT NULL,
  source_domain VARCHAR(255),

  -- Quality/confidence
  confidence DECIMAL(3, 2), -- 0.00-1.00
  evidence_text TEXT, -- Supporting quote/excerpt

  -- Extraction details
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  extraction_model VARCHAR(50), -- 'gpt-4o'
  extraction_prompt_tokens INT,
  extraction_completion_tokens INT,
  extraction_cost_usd DECIMAL(10, 6) DEFAULT 0,

  -- Deduplication
  content_hash VARCHAR(64), -- Hash for duplicate detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  canonical_insight_id UUID REFERENCES insights(insight_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_insights_scrape ON insights(scrape_id);
CREATE INDEX idx_insights_type ON insights(insight_type);
CREATE INDEX idx_insights_schema ON insights(extraction_schema);
CREATE INDEX idx_insights_duplicate ON insights(is_duplicate);
CREATE INDEX idx_insights_canonical ON insights(canonical_insight_id)
  WHERE canonical_insight_id IS NOT NULL;
CREATE INDEX idx_insights_content_hash ON insights(content_hash)
  WHERE content_hash IS NOT NULL;
CREATE INDEX idx_insights_confidence ON insights(confidence DESC)
  WHERE confidence IS NOT NULL;

-- JSONB GIN index for structured data queries
CREATE INDEX idx_insights_structured_gin
  ON insights USING gin(structured_data)
  WHERE insight_type IN ('structured', 'metric');
```

#### 8. Insight Sources Table (Multi-source tracking)

```sql
CREATE TABLE insight_sources (
  insight_source_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  insight_id UUID NOT NULL REFERENCES insights(insight_id) ON DELETE CASCADE,
  scrape_id UUID NOT NULL REFERENCES scrapes(scrape_id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(insight_id, scrape_id)
);

-- Indexes
CREATE INDEX idx_insight_sources_insight ON insight_sources(insight_id);
CREATE INDEX idx_insight_sources_scrape ON insight_sources(scrape_id);
```

#### 9. Budget Snapshots Table

```sql
CREATE TABLE budget_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(domain_id),
  query_id UUID REFERENCES queries(query_id),

  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  time_used_seconds INT NOT NULL,
  time_remaining_seconds INT NOT NULL,
  pages_scraped INT NOT NULL,
  pages_remaining INT NOT NULL,

  cost_usd DECIMAL(10, 4) NOT NULL,

  -- Trigger reason
  trigger_reason VARCHAR(50) -- 'query_start', 'query_end', 'compensation', 'threshold'
);

-- Indexes
CREATE INDEX idx_budget_snapshots_run ON budget_snapshots(run_id);
CREATE INDEX idx_budget_snapshots_query ON budget_snapshots(query_id);
CREATE INDEX idx_budget_snapshots_at ON budget_snapshots(snapshot_at DESC);
```

#### 10. Execution Logs Table

```sql
CREATE TABLE execution_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  run_id UUID NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(domain_id),
  query_id UUID REFERENCES queries(query_id),

  log_level VARCHAR(20) NOT NULL, -- 'info', 'warn', 'error', 'debug'
  event_type VARCHAR(50) NOT NULL, -- 'query_generated', 'scrape_started', 'insight_extracted'
  message TEXT NOT NULL,

  metadata JSONB,

  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_execution_logs_run ON execution_logs(run_id);
CREATE INDEX idx_execution_logs_query ON execution_logs(query_id);
CREATE INDEX idx_execution_logs_level ON execution_logs(log_level);
CREATE INDEX idx_execution_logs_event ON execution_logs(event_type);
CREATE INDEX idx_execution_logs_at ON execution_logs(logged_at DESC);
```

### D. Triggers & Functions

```sql
-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_domains_updated_at BEFORE UPDATE ON domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_queries_updated_at BEFORE UPDATE ON queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_scrapes_updated_at BEFORE UPDATE ON scrapes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update domain aggregates when query completes
CREATE OR REPLACE FUNCTION update_domain_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE domains
    SET
      total_queries = total_queries + 1,
      successful_queries = successful_queries + 1,
      time_used_seconds = time_used_seconds +
        COALESCE(EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INT, 0),
      pages_scraped = pages_scraped + NEW.successful_scrapes,
      total_insights = total_insights + NEW.total_insights
    WHERE domain_id = NEW.domain_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_domain_on_query_complete
  AFTER UPDATE ON queries
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_domain_stats();

-- Update run aggregates when domain completes
CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE runs
    SET
      time_used_seconds = (
        SELECT COALESCE(SUM(time_used_seconds), 0) FROM domains WHERE run_id = NEW.run_id
      ),
      pages_scraped = (
        SELECT COALESCE(SUM(pages_scraped), 0) FROM domains WHERE run_id = NEW.run_id
      ),
      total_cost_usd = (
        SELECT COALESCE(SUM(cost_usd), 0) FROM domains WHERE run_id = NEW.run_id
      )
    WHERE run_id = NEW.run_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_run_on_domain_complete
  AFTER UPDATE ON domains
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_run_stats();
```

### E. Views for Common Access Patterns

```sql
-- Complete run summary
CREATE VIEW run_summary AS
SELECT
  r.run_id,
  r.company_id,
  r.status,
  r.started_at,
  r.completed_at,
  r.total_duration_ms,
  r.time_used_seconds,
  r.time_budget_seconds,
  r.pages_scraped,
  r.page_budget,
  r.total_cost_usd,
  COUNT(DISTINCT d.domain_id) as total_domains,
  COUNT(DISTINCT q.query_id) as total_queries,
  COUNT(DISTINCT s.scrape_id) as total_scrapes,
  COUNT(DISTINCT i.insight_id) as total_insights,
  SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) as successful_scrapes,
  SUM(CASE WHEN s.status IN ('failed', 'invalid') THEN 1 ELSE 0 END) as failed_scrapes,
  ROUND(100.0 * r.time_used_seconds / NULLIF(r.time_budget_seconds, 0), 2) as time_usage_pct,
  ROUND(100.0 * r.pages_scraped / NULLIF(r.page_budget, 0), 2) as page_usage_pct
FROM runs r
LEFT JOIN domains d ON r.run_id = d.run_id
LEFT JOIN queries q ON d.domain_id = q.domain_id
LEFT JOIN scrapes s ON q.query_id = s.query_id
LEFT JOIN insights i ON s.scrape_id = i.scrape_id
GROUP BY r.run_id;

-- Domain progress tracking (for frontend streaming)
CREATE VIEW domain_progress AS
SELECT
  d.domain_id,
  d.run_id,
  d.name,
  d.display_name,
  d.status,
  d.execution_order,
  d.time_used_seconds,
  d.time_budget_seconds,
  d.pages_scraped,
  d.page_budget,
  d.cost_usd,
  d.total_queries,
  d.successful_queries,
  d.total_insights,
  ROUND(100.0 * d.time_used_seconds / NULLIF(d.time_budget_seconds, 0), 2) as time_progress_pct,
  ROUND(100.0 * d.pages_scraped / NULLIF(d.page_budget, 0), 2) as page_progress_pct,
  ROUND(100.0 * d.successful_queries / NULLIF(d.total_queries, 0), 2) as query_success_pct
FROM domains d;

-- Domain success rate analysis
CREATE VIEW domain_performance AS
SELECT
  s.domain,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN s.status = 'invalid' THEN 1 ELSE 0 END) as invalid,
  ROUND(100.0 * SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ARRAY_AGG(DISTINCT s.invalid_reason) FILTER (WHERE s.invalid_reason IS NOT NULL) as failure_reasons,
  AVG(s.duration_ms) FILTER (WHERE s.status = 'success') as avg_duration_ms,
  AVG(s.attempt_count) as avg_attempts
FROM scrapes s
GROUP BY s.domain
HAVING COUNT(*) >= 3
ORDER BY success_rate ASC, total_attempts DESC;
```

---

## IV. Domain Types & Workflows

### A. Search-Based Domains

**Domains**: VC Profile, Financials, 3rd Party Info, Similar Companies

**Workflow**:

```
1. Generate query text (LLM)
2. Execute Serper search
3. Filter search results (LLM evaluates relevance)
4. Batch scrape selected URLs
5. Extract insights (LLM per scrape)
6. Generate follow-up query based on insights
7. Recurse if depth budget remains
```

**Example (VC Profile)**:

```typescript
// Query generation
query_text: "Sequoia Capital investment in Acme Corp"

// Source config
source_type: "search"
source_config: {
  search_engine: "serper",
  search_text: "Sequoia Capital investment in Acme Corp",
  num_results: 10
}

// Discovered items (10 search results)
// Filter: LLM scores each, select top 5
// Scrape: Parallel scrape of 5 URLs
// Extract: Identify investors, funding amounts, credibility signals
```

### B. Crawl-Based Domains

**Domains**: Product Info, Company Events, Jobs

**Workflow**:

```
1. Start with company domain
2. Execute Firecrawl map (discover all pages)
3. Categorize pages by path pattern
4. Filter: Select relevant categories
5. Batch scrape selected pages
6. Extract structured data per category
```

**Example (Product Info)**:

```typescript
// Source config
source_type: "crawl"
source_config: {
  root_url: "https://acme.com",
  discovery_method: "firecrawl_map",
  include_patterns: [
    "/pricing",
    "/docs/*",
    "/blog/*",
    "/changelog",
    "/about"
  ],
  exclude_patterns: ["/admin/*", "/login"],
  max_pages: 50
}

// Discovered items (50 crawled pages)
// Categorize: pricing, docs, blog, changelog, about
// Scrape: Top 10 pages (2 per category)
// Extract: Structured data per category:
//   - Pricing: {model, tiers, free_tier}
//   - Docs: {has_docs, quality_score}
//   - Changelog: {latest_release, frequency}
```

### C. API-Based Domains

**Domains**: Founder Profile (LinkedIn/GitHub), Community Presence (social stats)

**Workflow**:

```
1. Identify API endpoints
2. Execute API calls (no scraping)
3. Parse structured responses
4. Transform to insight format
```

**Example (GitHub Integration)**:

```typescript
// Source config
source_type: "api"
source_config: {
  provider: "github",
  endpoint: "/repos/acme/product",
  query_params: {
    include: "contributors,stats,releases"
  }
}

// Discovered item (API response)
item_type: "api_response"
metadata: {
  stars: 15000,
  forks: 2000,
  language: "TypeScript",
  contributors_count: 150,
  is_open_source: true,
  latest_release: "v2.1.0",
  release_date: "2026-01-28"
}

// Extract insights
insight_type: "structured"
structured_data: {
  github_url: "https://github.com/acme/product",
  is_open_source: true,
  stars: 15000,
  primary_language: "TypeScript",
  top_contributors: [...]
}
```

### D. Manual Domains

**Domains**: Known community links, contact sales

**Workflow**:

```
1. Predefined URL list
2. Scrape each URL
3. Extract metrics/content
```

**Example (Community Presence)**:

```typescript
// Source config
source_type: "manual"
source_config: {
  urls: [
    "https://reddit.com/r/acme",
    "https://discord.gg/acme",
    "https://youtube.com/@acme"
  ],
  reason: "known_community_links"
}

// Scrape each
// Extract metrics:
//   - Reddit: members, post_frequency
//   - Discord: members, activity_level
//   - YouTube: subscribers, video_count
```

---

## V. Execution Patterns

### A. Progressive Query Generation

**Pattern**: Sequential query generation where each query informs the next.

```typescript
// Orchestrator loop
for (let i = 0; i < breadth; i++) {
    // Generate query based on previous results
    const context = accumulatedInsights.slice(0, i);
    const query = await generateQuery(domain, depth, context);

    // Execute query
    const results = await executeQuery(query);

    // Accumulate insights
    accumulatedInsights.push(...results.insights);

    // Check budget
    if (budgetExhausted()) break;
}
```

**Benefits**:

- Each query is informed by previous discoveries
- Avoids redundant queries
- Adapts to what's been learned

**Tradeoffs**:

- Sequential execution (slower than parallel)
- LLM calls scale with breadth (3 queries = 3 LLM calls)

### B. Parallel Scraping with Batch Triggering

**Pattern**: Use `batchTriggerAndWait` for concurrent scraping within a query.

```typescript
// After filtering discovered items
const scrapeItems = discoveredItems
    .filter((item) => item.should_scrape)
    .map((item) => ({
        payload: {
            url: item.url,
            scrapeMethod: 'firecrawl_scrape',
            proxyMode: 'basic',
        },
    }));

// Parallel execution
const results = await scrapeTask.batchTriggerAndWait(scrapeItems);

// Handle partial failures
for (const result of results.runs) {
    if (result.ok) {
        // Process successful scrape
    } else {
        // Log failure, continue with others
    }
}
```

**Concurrency Control**:

```typescript
// Limit concurrent scrapes per domain
const scrapesGroupedByDomain = groupBy(scrapeItems, 'domain');

for (const [domain, items] of scrapesGroupedByDomain) {
    // Interleave: scrape 1 from each domain in round-robin
    const interleavedBatch = interleave(items);
    await scrapeTask.batchTriggerAndWait(interleavedBatch);
}
```

### C. Retry with Proxy Escalation

**Pattern**: Per-scrape retry with proxy mode escalation.

```typescript
async function scrapeWithRetry(url: string) {
    const proxyModes = ['basic', 'stealth', 'stealth'];

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // Write attempt metadata
            await db.scrapes.update({
                attempt_count: attempt + 1,
                proxy_mode: proxyModes[attempt],
                status: 'retrying',
            });

            // Execute scrape
            const result = await firecrawl.scrape(url, {
                proxy: proxyModes[attempt],
            });

            // Success
            await db.scrapes.update({
                status: 'success',
                content_hash: hash(result.content),
            });

            return result;
        } catch (error) {
            // Write failure metadata
            await db.scrapes.update({
                error_details: {
                    [`attempt_${attempt + 1}`]: {
                        proxy: proxyModes[attempt],
                        error: error.message,
                        timestamp: new Date(),
                    },
                },
            });

            if (attempt === 2) {
                // Final attempt failed
                await db.scrapes.update({
                    status: 'invalid',
                    invalid_reason: detectInvalidReason(error),
                });
                throw error;
            }
        }
    }
}
```

### D. Compensation Logic

**Trigger Condition**: >50% of scrapes failed at a recursion level.

```typescript
async function evaluateCompensation(queryId: string) {
    const stats = await db.queries.findUnique({
        where: { query_id: queryId },
        select: {
            successful_scrapes: true,
            failed_scrapes: true,
            is_compensation: true,
        },
    });

    const totalScrapes = stats.successful_scrapes + stats.failed_scrapes;
    const failureRate = stats.failed_scrapes / totalScrapes;

    // Only compensate once per run
    if (failureRate > 0.5 && !stats.is_compensation) {
        // Generate compensation query
        const compQuery = await generateCompensationQuery(queryId);

        await db.queries.create({
            data: {
                pillar_id: query.pillar_id,
                parent_query_id: queryId,
                depth: query.depth + 1,
                query_text: compQuery.text,
                is_compensation: true,
                compensation_reason: `${failureRate * 100}% failure rate at depth ${query.depth}`,
            },
        });

        // Execute compensation query
        await executeQuery(compQuery);
    }
}
```

### E. Budget Enforcement

**Pattern**: Check budgets before each expensive operation.

```typescript
async function checkBudget(runId: string): Promise<boolean> {
    const run = await db.runs.findUnique({ where: { run_id: runId } });

    // Time budget
    if (run.time_used_seconds >= run.time_budget_seconds) {
        await logBudgetExhaustion(runId, 'time');
        return false;
    }

    // Page budget
    if (run.pages_scraped >= run.page_budget) {
        await logBudgetExhaustion(runId, 'pages');
        return false;
    }

    // Cost budget
    if (run.total_cost_usd >= run.cost_budget_usd) {
        await logBudgetExhaustion(runId, 'cost');
        return false;
    }

    return true;
}

// Call before each query
if (!(await checkBudget(runId))) {
    throw new BudgetExhaustedError('Run budget exhausted');
}
```

---

## VI. Budget Management

### A. Budget Allocation Strategy

**Default allocation per domain**:

| Domain            | Time % | Page % | Rationale                         |
| ----------------- | ------ | ------ | --------------------------------- |
| VC Profile        | 20%    | 20%    | Targeted search, few sources      |
| Founder Profile   | 15%    | 15%    | API-heavy, less scraping          |
| Financials        | 20%    | 20%    | Critical data, high priority      |
| Team Profile      | 10%    | 10%    | Lightweight structured extraction |
| Product Info      | 15%    | 20%    | Crawl-intensive                   |
| Community         | 5%     | 5%     | Manual URLs, quick scrapes        |
| Customer Profile  | 5%     | 5%     | Few pages to scrape               |
| Events            | 3%     | 2%     | Manual or API                     |
| Jobs              | 5%     | 5%     | Career page crawl                 |
| 3rd Party         | 10%    | 10%    | Search + scrape press             |
| Similar Companies | 5%     | 5%     | Lightweight comparison            |
| Contact Sales     | 2%     | 2%     | Single page scrape                |

**Dynamic reallocation**:

- Unused budget from completed domains redistributed to remaining
- High-value domains (Financials, VC) can request budget increase

### B. Cost Tracking

**Per-operation cost tracking**:

| Operation                | Cost Model         | Example                 |
| ------------------------ | ------------------ | ----------------------- |
| Serper search            | $0.001 per query   | $0.003 for 3 queries    |
| LLM filter (GPT-4o-mini) | $0.01 per 10 links | $0.01 for 10 results    |
| Firecrawl scrape         | $0.02 per page     | $0.10 for 5 pages       |
| LLM extract (GPT-4o)     | $0.03 per page     | $0.15 for 5 extractions |
| **Total per query**      |                    | **$0.293**              |

**Per-domain estimate** (breadth=3, depth=2):

- 3 level-1 queries: $0.88
- 9 level-2 queries: $2.64
- **Total: $3.52 per domain**

**Full run (5 domains)**: ~$17.60

**Optimization levers**:

1. Use GPT-4o-mini for filtering/formatting (-50% cost)
2. Firecrawl caching (cache hit = $0.004 vs $0.02, 80% savings)
3. Aggressive filtering (scrape 3 vs 5 links per query, -40%)
4. Reduce depth (depth=1 vs depth=2, -75% queries)

---

## VII. Query Patterns

### A. Get Complete Run Data

```sql
-- Full run with all domains, queries, insights
SELECT
  r.run_id,
  r.company_id,
  r.status,
  json_agg(
    json_build_object(
      'domain_id', d.domain_id,
      'name', d.name,
      'status', d.status,
      'total_insights', d.total_insights,
      'cost_usd', d.cost_usd,
      'queries', (
        SELECT json_agg(
          json_build_object(
            'query_id', q.query_id,
            'query_text', q.query_text,
            'depth', q.depth,
            'total_insights', q.total_insights,
            'insights', (
              SELECT json_agg(
                json_build_object(
                  'insight_text', i.insight_text,
                  'structured_data', i.structured_data,
                  'source_url', i.source_url,
                  'confidence', i.confidence
                )
              )
              FROM insights i
              JOIN scrapes s ON i.scrape_id = s.scrape_id
              WHERE s.query_id = q.query_id
            )
          )
        )
        FROM queries q
        WHERE q.domain_id = d.domain_id
      )
    )
  ) as domains
FROM runs r
LEFT JOIN domains d ON r.run_id = d.run_id
WHERE r.run_id = $1
GROUP BY r.run_id;
```

### B. Get Insights by Domain

```sql
-- All insights for a specific domain
SELECT
  i.insight_id,
  i.insight_type,
  i.insight_text,
  i.structured_data,
  i.source_url,
  i.confidence,
  i.extracted_at,
  q.query_text,
  q.depth
FROM insights i
JOIN scrapes s ON i.scrape_id = s.scrape_id
JOIN queries q ON s.query_id = q.query_id
WHERE q.domain_id = $1
  AND i.is_duplicate = FALSE
ORDER BY i.confidence DESC, i.extracted_at DESC;
```

### C. Domain Performance Analysis

```sql
-- Success rate and failure reasons by domain
SELECT
  s.domain,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN s.status = 'invalid' THEN 1 ELSE 0 END) as invalid,
  ROUND(100.0 * SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
  ARRAY_AGG(DISTINCT s.invalid_reason) FILTER (WHERE s.invalid_reason IS NOT NULL) as failure_reasons,
  AVG(s.attempt_count) as avg_attempts,
  AVG(s.duration_ms) FILTER (WHERE s.status = 'success') as avg_scrape_duration
FROM scrapes s
JOIN queries q ON s.query_id = q.query_id
JOIN domains d ON q.domain_id = d.domain_id
WHERE d.run_id = $1
GROUP BY s.domain
HAVING COUNT(*) >= 2
ORDER BY success_rate ASC;
```

### D. Cost Breakdown by Domain and Source Type

```sql
-- Cost analysis per domain and source type
SELECT
  d.name as domain_name,
  se.source_type,
  COUNT(DISTINCT se.search_id) as queries,
  SUM(se.cost_usd) as discovery_cost,
  SUM(it.evaluation_cost_usd) as evaluation_cost,
  SUM(s.firecrawl_cost_usd) as scrape_cost,
  SUM(i.extraction_cost_usd) as extraction_cost,
  SUM(
    COALESCE(se.cost_usd, 0) +
    COALESCE(it.evaluation_cost_usd, 0) +
    COALESCE(s.firecrawl_cost_usd, 0) +
    COALESCE(i.extraction_cost_usd, 0)
  ) as total_cost
FROM domains d
JOIN queries q ON d.domain_id = q.domain_id
JOIN searches se ON q.query_id = se.query_id
LEFT JOIN items it ON se.search_id = it.search_id
LEFT JOIN scrapes s ON it.item_id = s.item_id
LEFT JOIN insights i ON s.scrape_id = i.scrape_id
WHERE d.run_id = $1
GROUP BY d.name, se.source_type
ORDER BY total_cost DESC;
```

### E. Recursive Query Tree

```sql
-- Visualize query tree with insights per node
WITH RECURSIVE query_tree AS (
  -- Base: root queries
  SELECT
    q.query_id,
    q.parent_query_id,
    q.query_text,
    q.depth,
    q.status,
    q.total_insights,
    q.is_compensation,
    0 as level,
    ARRAY[q.query_id] as path,
    q.query_id::text as tree_path
  FROM queries q
  WHERE q.parent_query_id IS NULL
    AND q.pillar_id = $1

  UNION ALL

  -- Recursive: child queries
  SELECT
    q.query_id,
    q.parent_query_id,
    q.query_text,
    q.depth,
    q.status,
    q.total_insights,
    q.is_compensation,
    qt.level + 1,
    qt.path || q.query_id,
    qt.tree_path || ' > ' || q.query_id::text
  FROM queries q
  JOIN query_tree qt ON q.parent_query_id = qt.query_id
)
SELECT
  REPEAT('  ', level) || query_text as query_hierarchy,
  depth,
  status,
  total_insights,
  CASE WHEN is_compensation THEN '⚠️ COMPENSATION' ELSE '' END as flags,
  tree_path
FROM query_tree
ORDER BY path;
```

### F. Real-Time Progress Query (for frontend)

```sql
-- Current state for progress streaming
SELECT
  r.run_id,
  r.status as run_status,
  r.time_used_seconds,
  r.time_budget_seconds,
  r.pages_scraped,
  r.page_budget,
  json_agg(
    json_build_object(
      'domain_name', d.name,
      'domain_status', d.status,
      'execution_order', d.execution_order,
      'current_query', (
        SELECT q.query_text
        FROM queries q
        WHERE q.domain_id = d.domain_id
          AND q.status = 'in_progress'
        LIMIT 1
      ),
      'completed_queries', d.successful_queries,
      'total_queries', d.total_queries,
      'total_insights', d.total_insights
    )
    ORDER BY d.execution_order
  ) as domain_progress
FROM runs r
LEFT JOIN domains d ON r.run_id = d.run_id
WHERE r.run_id = $1
GROUP BY r.run_id;
```

---

## VIII. Scaling Strategy

### A. Partitioning Strategy

**When to partition**: At 100k+ companies (1.5M+ scrapes, 5M+ insights)

**Partition by time (monthly)**:

```sql
-- Partition scrapes by created_at (monthly)
CREATE TABLE scrapes (
  scrape_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ...
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE scrapes_2026_01 PARTITION OF scrapes
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE scrapes_2026_02 PARTITION OF scrapes
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Repeat for insights, execution_logs
```

**Benefits**:

- Query pruning (only scan relevant partitions)
- Easy archival (detach old partitions)
- Faster inserts (smaller indexes per partition)

### B. Index Optimization

**Hot vs Cold Indexes**:

**Hot (always needed)**:

- Primary keys (UUIDv7)
- Foreign keys (joins)
- Status columns (filtering)
- Time columns (ordering)

**Cold (optional, build as needed)**:

- JSONB GIN indexes (expensive, only if querying JSONB frequently)
- Full-text search indexes (only if implementing text search)
- Partial indexes on rare conditions

**Index maintenance**:

```sql
-- Monitor index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Drop unused indexes
DROP INDEX IF EXISTS idx_rarely_used;
```

### C. Connection Pooling

**Neon's built-in pooling**:

```typescript
import { neon } from '@neondatabase/serverless';

// Pooling via Neon's HTTP fetch
const sql = neon(process.env.DATABASE_URL, {
    poolQueryViaFetch: true,
    fetchConnectionCache: true,
});
```

**No manual pooling needed** - Neon handles 1000s of concurrent connections.

### D. Write Batching

**⚠️ Phase 6+ optimization only - NOT for MVP**

**When to implement**:

- You're running >100 concurrent orchestrators
- Profiling shows DB writes consuming >10% of runtime
- You have evidence that write latency is a bottleneck

**For Phase 1-5**: Use direct writes. This optimization is premature.

**For high-volume writes** (e.g., 100 concurrent scrapes writing insights):

```typescript
// Buffer writes, flush periodically
const insightBuffer: Insight[] = [];

async function writeInsight(insight: Insight) {
    insightBuffer.push(insight);

    if (insightBuffer.length >= 50) {
        await flushInsights();
    }
}

async function flushInsights() {
    if (insightBuffer.length === 0) return;

    // Batch insert
    await db.insights.createMany({
        data: insightBuffer,
        skipDuplicates: true,
    });

    insightBuffer.length = 0;
}
```

**Trade-off**: Adds latency (wait for buffer to fill) but reduces write amplification.

### E. Read Replicas (Future)

**When needed**: >10k concurrent reads

**Neon supports read replicas**:

```typescript
// Primary (write)
const primarySql = neon(process.env.DATABASE_URL);

// Replica (read)
const replicaSql = neon(process.env.DATABASE_READ_REPLICA_URL);

// Route queries
await primarySql`INSERT INTO ...`; // writes to primary
const data = await replicaSql`SELECT ...`; // reads from replica
```

---

## IX. Cost Model

### A. Cost Per Run Estimate

**Assumptions**:

- 5 domains
- Breadth = 3, Depth = 2
- 15 total queries (1 + 3 + 9 = 13, plus 2 compensation)
- 5 links scraped per query
- 75 total scrapes
- 2 insights per scrape = 150 insights

**Breakdown**:

| Component                | Unit Cost       | Quantity  | Total      |
| ------------------------ | --------------- | --------- | ---------- |
| Serper search            | $0.001          | 15        | $0.015     |
| LLM filter (GPT-4o-mini) | $0.001 per link | 150 links | $0.15      |
| Firecrawl scrape         | $0.02           | 75        | $1.50      |
| LLM extract (GPT-4o)     | $0.03           | 75        | $2.25      |
| LLM query gen (GPT-4o)   | $0.02           | 15        | $0.30      |
| **Total**                |                 |           | **$4.215** |

**With optimizations**:

- Use GPT-4o-mini for extraction: $2.25 → $0.75 (save $1.50)
- Firecrawl caching (50% hit rate): $1.50 → $0.75 (save $0.75)
- Aggressive filtering (scrape 3 vs 5): 75 → 45 scrapes (save $0.60)

**Optimized total: $1.965 per run**

### B. Monthly Cost Projections

**Scale scenarios**:

| Companies/Month | Runs    | Cost/Run | Monthly Cost |
| --------------- | ------- | -------- | ------------ |
| 100             | 100     | $2.00    | $200         |
| 1,000           | 1,000   | $2.00    | $2,000       |
| 10,000          | 10,000  | $1.80    | $18,000      |
| 100,000         | 100,000 | $1.50    | $150,000     |

**Cost reduction at scale**:

- Bulk API pricing (Serper, OpenAI)
- Higher cache hit rates
- Amortized infrastructure costs

### C. Database Storage Costs

**At 100k companies**:

- Total data: ~39 GB (compressed: ~30 GB)
- Neon storage: $0.16/GB/month
- Storage cost: 30 GB × $0.16 = **$4.80/month**

**Negligible compared to API costs**.

---

## X. Observability

### A. Metrics to Track

**Run-level**:

- Success rate (% completed vs failed)
- Average duration
- Budget utilization (time, pages, cost)
- Cost per run

**Domain-level**:

- Insights per domain
- Domain completion time
- Domain success rate
- Cost per domain

**Query-level**:

- Scrape success rate by domain
- Average attempts per domain
- Common failure reasons
- Blocked domains (>80% failure rate)

**Query-level**:

- Query success rate
- Insights per query
- Compensation trigger rate

### B. Frontend Streaming

**Real-time metadata updates**:

```typescript
import { useRealtimeRun } from '@trigger.dev/react-hooks';

function DeepResearchProgress({ runId, accessToken }) {
  const { run } = useRealtimeRun(runId, { accessToken });

  // run.metadata updates automatically
  const metadata = run?.metadata as {
    status: string;
    current_pillar: string;
    pillar_progress: number;
    total_insights: number;
    budget_used: { time: number; pages: number };
  };

  return (
    <div>
      <h3>Status: {metadata.status}</h3>
      <p>Current: {metadata.current_pillar}</p>
      <Progress value={metadata.pillar_progress} />
      <p>Insights: {metadata.total_insights}</p>
      <p>Time used: {metadata.budget_used.time}s</p>
    </div>
  );
}
```

**Metadata structure**:

```typescript
// Written by orchestrator task
await metadata.set('status', 'in_progress');
await metadata.set('current_pillar', 'vc_profile');
await metadata.set('pillar_progress', 33); // 1 of 3 queries done
await metadata.set('total_insights', 12);
await metadata.set('budget_used', { time: 45, pages: 15 });
await metadata.append('completed_queries', 'Sequoia investment info');
```

### C. Logging Strategy

**Log levels**:

- `info`: Normal execution flow (query started, scrape completed)
- `warn`: Recoverable issues (retry triggered, budget threshold)
- `error`: Failures (scrape failed after retries, compensation triggered)
- `debug`: Detailed trace (LLM prompts, API responses)

**Structured logging**:

```typescript
logger.info('Query completed', {
    run_id: runId,
    pillar_id: pillarId,
    query_id: queryId,
    query_text: queryText,
    duration_ms: 12500,
    insights_extracted: 8,
    scrapes_successful: 5,
    scrapes_failed: 0,
});
```

**Log aggregation**:

- Store in `execution_logs` table
- Index by run_id, query_id, log_level
- Query for debugging specific runs

---

## XI. Migration Path

### Phase 1: MVP (Search-Only) - Week 1-2

**Goal**: Validate single-domain research with search-based discovery.

**Implement**:

- Core schema (7 tables: runs, domains, queries, searches, items, scrapes, insights)
- Source type: `search` only
- Single domain: VC Profile or Financials
- Depth=1, breadth=3 (no recursion)
- Basic LLM filtering and extraction
- **Simple, direct DB writes** (no batching, no in-memory caching)

**Implementation Pattern**:

```typescript
// Straightforward: Write immediately, read when needed
await db.queries.update({ query_id, status: 'in_progress' });
const results = await executeQuery(queryId);
await db.queries.update({
    query_id,
    status: 'completed',
    total_insights: results.length,
});
```

**Explicitly Do NOT Implement**:

- ❌ In-memory state caching
- ❌ Write batching or buffering
- ❌ Complex checkpoint systems
- ❌ DB connection pooling optimization

**Rationale**:

- DB writes are ~2-3% of runtime (Serper + Firecrawl + LLM dominate at 75%+)
- Keep it simple: optimize external API usage, not DB access
- Prove product-market fit before engineering optimization

**Success Criteria**:

- 1 domain completes successfully
- Insights written to DB
- Cost per run < $2
- No manual intervention needed
- Total runtime: 40-60s (acceptable for Phase 1)

**Output**: Working prototype for 1 domain

---

### Phase 2: Add Progressive Refinement - Week 3

**Goal**: Implement progressive query generation and recursion.

**Implement**:

- Progressive LLM query generation (context-aware)
- Depth=2 (two levels of recursion)
- Compensation logic (>50% failure trigger)
- Budget enforcement (time, pages)

**Success Criteria**:

- Query tree with 1 + 3 + 9 = 13 queries
- Compensation triggered on >50% failure
- Budget stops execution when exhausted

**Output**: Recursive research for 1 domain

---

### Phase 3: Multi-Domain Support - Week 4

**Goal**: Add 4 more domains (total 5).

**Implement**:

- Domain-level orchestration (sequential execution)
- Budget allocation per domain
- Cross-domain deduplication

**Domains**:

1. VC Profile (search)
2. Financials (search)
3. Founder Profile (search)
4. Team Profile (search)
5. 3rd Party Info (search)

**Success Criteria**:

- 5 domains complete for a company
- Total runtime < 5 minutes
- Total cost < $5

**Output**: Full search-based research agent

---

### Phase 4: Add Crawl Support - Week 5-6

**Goal**: Support crawl-based domains (Product Info, Jobs).

**Implement**:

- Source type: `crawl`
- Firecrawl map integration
- Page categorization logic
- Structured data extraction

**New Domains**: 6. Product Info (crawl) 7. Jobs (crawl)

**Success Criteria**:

- Crawl discovers 20-50 pages
- Categorization filters to top 10
- Structured insights extracted (pricing model, job count)

**Output**: Hybrid search+crawl agent

---

### Phase 5: API Integration - Week 7-8

**Goal**: Add API-based sources (GitHub, LinkedIn).

**Implement**:

- Source type: `api`
- GitHub API integration
- Structured response parsing

**New Domains**: 8. Founder Profile (enhanced with LinkedIn API) 9. Community Presence (social media APIs)

**Success Criteria**:

- GitHub stats extracted (stars, forks, contributors)
- LinkedIn activity scores calculated
- No scraping needed for API sources

**Output**: Full multi-source research agent

---

### Phase 6: Polish & Optimization - Week 9-10

**Goal**: Production-ready system.

**Implement**:

- Frontend progress streaming
- Cost optimization (caching, filtering)
- Error recovery UI
- Analytics dashboard
- Domain blocklist (auto-skip failing domains)

**Success Criteria**:

- Cost per run < $2 (with optimizations)
- 95%+ domain success rate
- Full observability in UI

**Output**: Production-ready deep research system

---

### Phase 7: Scale Testing - Week 11-12

**Goal**: Validate at 10k companies.

**Implement**:

- Batch research triggers (100 companies/hour)
- Database partitioning (if needed)
- Connection pooling tuning
- Cost monitoring alerts

**Success Criteria**:

- 10k companies researched successfully
- Database performance stable
- Monthly cost predictable

**Output**: Proven scalability

---

## XII. Open Questions & Decisions

### A. Technical Decisions

1. **Deduplication Strategy**
    - Post-run semantic merge vs hash-based unique constraint?
    - Trade-off: Accuracy vs complexity

2. **Scrape Timeout**
    - How long to wait for `batchTriggerAndWait` before proceeding with partial results?
    - Trade-off: Completeness vs latency

3. **LLM Model Selection**
    - GPT-4o vs GPT-4o-mini for extraction?
    - Trade-off: Quality vs cost

4. **Cache TTL**
    - Firecrawl maxAge: 7 days, 30 days, or dynamic per domain?
    - Trade-off: Freshness vs cost

### B. Product Decisions

1. **Domain Priority**
    - Which 5 domains ship first?
    - Recommendation: VC, Financials, Founder, Product, 3rd Party

2. **Depth/Breadth Defaults**
    - depth=2, breadth=3 too aggressive?
    - Consider: depth=1, breadth=5 for broader coverage

3. **User Control**
    - Let users select domains or always run all?
    - Let users adjust depth/breadth or fixed?

4. **Refresh Strategy**
    - Manual trigger only or scheduled refresh?
    - Incremental refresh (delta) or full re-run?

---

## XIII. Appendix

### A. Example Run Trace

**Company**: Acme Corp (YC W24)  
**Domains Selected**: VC Profile, Financials  
**Budget**: 120s, 40 pages, $3.00

**Execution Trace**:

```
[00:00] Run started: run_xyz
[00:01] Domain: VC Profile (1/2)
[00:02]   Query 1 (depth=0): "Sequoia Capital investment Acme Corp"
[00:03]     Serper: 10 results
[00:04]     LLM filter: 5 selected
[00:05]     Batch scrape: 5 URLs (parallel)
[00:12]       Scrape 1: crunchbase.com/org/acme (success)
[00:12]       Scrape 2: techcrunch.com/acme-raises-50m (success)
[00:12]       Scrape 3: sequoiacap.com/companies/acme (failed: 403)
[00:15]       Scrape 3 retry: stealth proxy (success)
[00:15]       Scrape 4: linkedin.com/... (invalid: paywall)
[00:15]       Scrape 5: bloomberg.com/... (invalid: paywall)
[00:16]     LLM extract: 4 insights from 3 successful scrapes
[00:18]   Query 2 (depth=0): "Acme Corp Series B investors"
[00:19]     Serper: 10 results
[00:20]     LLM filter: 4 selected
[00:21]     Batch scrape: 4 URLs
[00:26]       All 4 successful
[00:27]     LLM extract: 6 insights
[00:29]   Query 3 (depth=0): "Acme Corp funding history timeline"
[00:30]     Serper: 10 results
[00:31]     LLM filter: 5 selected
[00:32]     Batch scrape: 5 URLs
[00:37]       All 5 successful
[00:38]     LLM extract: 8 insights
[00:40]   Budget: 40s used, 24 pages scraped
[00:40]   Compensation: Not triggered (failure rate: 20%)
[00:40] Domain: VC Profile completed (18 insights, $1.20)

[00:41] Domain: Financials (2/2)
[00:42]   Query 1 (depth=0): "Acme Corp funding rounds valuation"
[00:43]     Serper: 10 results
[00:44]     LLM filter: 5 selected
[00:45]     Batch scrape: 5 URLs
[00:50]       4 successful, 1 failed
[00:51]     LLM extract: 7 insights
[00:53]   Query 2 (depth=0): "Acme Corp revenue growth metrics"
[00:54]     Serper: 10 results
[00:55]     LLM filter: 3 selected (lower relevance)
[00:56]     Batch scrape: 3 URLs
[01:00]       All 3 successful
[01:01]     LLM extract: 5 insights
[01:03]   Query 3 (depth=0): "Acme Corp profitability burn rate"
[01:04]     Serper: 10 results
[01:05]     LLM filter: 4 selected
[01:06]     Batch scrape: 4 URLs
[01:11]       All 4 successful
[01:12]     LLM extract: 6 insights
[01:14]   Budget: 74s used, 40 pages scraped
[01:14]   Compensation: Not triggered (failure rate: 8%)
[01:14] Domain: Financials completed (18 insights, $1.25)

[01:15] Run completed: 36 insights, 74s, 40 pages, $2.45
```

### B. Schema Migration SQL

**Full migration script available in**: `db/migrations/004_deep_research_schema.sql`

**To apply**:

```bash
npm run db:migrate
```

---

**Document Version**: 2.0  
**Last Updated**: February 1, 2026  
**Status**: Design Complete, Implementation Phase 1 in Progress  
**Next Review**: After Phase 1 completion
