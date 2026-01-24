# Architecture and System Design

**YC Agent - Current Implementation (v0.1)**

## Overview

A Next.js-based platform for browsing and researching Y Combinator companies. The current implementation focuses on core data ingestion and display, with a pragmatic, single-layer data model optimized for iteration speed.

---

## A) Data Architecture: Unified Company Table

**Current Design Decision:** Single normalized table instead of multi-layer separation.

### Company Table Schema

```sql
companies (
  -- Identity & Provenance
  id UUID PRIMARY KEY
  source VARCHAR(50)              -- 'yc', future: 'crunchbase', 'manual'
  source_id TEXT                  -- external identifier
  source_url TEXT                 -- canonical source URL

  -- Core Fields (normalized from source)
  name, slug, website, logo_url
  one_liner, long_description

  -- Structured Filters (JSONB for flexibility)
  tags JSONB                      -- ["AI/ML", "B2B", ...]
  industries JSONB                -- ["Healthcare", ...]
  regions JSONB                   -- ["San Francisco", ...]

  -- Direct Filters
  batch, team_size, stage, status
  is_hiring, is_nonprofit
  all_locations

  -- Extensibility
  source_metadata JSONB           -- source-specific fields

  -- Timestamps
  created_at, updated_at, last_synced_at
)
```

**Key Constraints:**

- `UNIQUE(source, source_id)` enables upsert-based sync
- GIN indexes on JSONB fields for fast filtering
- Trigram index (`pg_trgm`) on `name` for fuzzy search readiness

**Rationale for Unified Model:**

- Faster iteration: single source of truth
- Simpler queries: no joins for basic display
- Adequate for current scale (thousands of companies)
- Can migrate to multi-layer later when adding crawled artifacts

**Deferred:**

- Separate artifact storage (HTML/PDFs/screenshots)
- Claims/knowledge graph layer
- Research job execution tracking

---

## B) Data Ingestion: YC Seed Script

**Current Implementation:** Synchronous batch upsert from YC's public API.

### Ingestion Flow (`scripts/ingest-yc-companies.ts`)

1. **Fetch** from `https://yc-oss.github.io/api/companies/all.json`
    - Retries: 3 attempts with exponential backoff
    - Timeout: 60s per attempt
2. **Validate**
    - Required fields: `id`, `name`, `slug`
    - Name length constraint (< 255 chars)
    - Skip invalid records with warnings
3. **Transform**
    - Map YC fields → company schema
    - Stringify JSONB fields (tags, industries, regions)
    - Preserve original data in `source_metadata`
    - Convert timestamps (Unix → ISO)
4. **Upsert** (batch size: 50)
    - `ON CONFLICT (source, source_id) DO UPDATE`
    - Updates all fields except `created_at`
    - Sets `last_synced_at` to NOW()
    - Error tolerance: fail if > 10% of batches error

**Run via:** `npm run db:ingest-yc`

**Characteristics:**

- One-time or manual refresh (no cron/scheduler yet)
- Single data source (YC only)
- No delta detection (full upsert every run)
- Takes ~30-60s for 5000+ companies

**Future Extensions:**

- Scheduled refresh (daily/weekly)
- Additional sources (Crunchbase, HN, manual curation)
- Delta sync with change detection
- Webhook triggers on YC data updates

---

## C) API Layer: Server Components + Server Actions

**Current Pattern:** React Server Components for data fetching, Server Actions for mutations.

### Data Flow

```
Page (RSC)
  ↓
getCompanies() [server action, cached]
  ↓
fetchCompaniesFromDB() [React cache, deduped]
  ↓
Neon Postgres (serverless driver)
```

### Caching Strategy

**Level 1: React `cache()` (Request-level)**

- Function: `fetchCompaniesFromDB()`
- Scope: Single RSC render pass
- Deduplicates identical queries in component tree

**Level 2: Next.js `unstable_cache()` (Persistent)**

- Function: `getCompanies()`
- TTL: 300s (5 minutes)
- Tags: `['companies']` for revalidation
- Keys: `['companies-list', 'cursor-${cursor}', 'limit-${limit}']`

**Level 3: Database** (Future)

- No query result caching yet
- Uses Postgres connection pooling (Neon serverless)

### Pagination

**Dual-mode support:**

1. **Cursor-based** (preferred for infinite scroll)
    - `WHERE id < ${cursor} ORDER BY batch DESC, id DESC`
    - Stable under writes
    - Returns `nextCursor` for client

2. **Offset-based** (current UI)
    - `LIMIT ${limit} OFFSET ${(page-1)*limit}`
    - Simpler for traditional page nav
    - Used with `?page=N` query param

**Trade-off:** Offset is less efficient for deep pagination but matches current UI pattern (numbered pages).

---

## D) Frontend Architecture: Next.js App Router

**Stack:**

- **Framework:** Next.js 16 (App Router, React 19)
- **Styling:** Tailwind CSS + Custom Design System (Linear-inspired)
- **Components:** Radix UI primitives + shadcn/ui patterns
- **State:** React Query (TanStack) for client mutations (not yet used)
- **Theme:** next-themes for dark mode

### Component Structure

```
app/page.tsx (RSC)
  ├─ CompaniesGrid
  │   └─ CompanyCard (client component)
  └─ CompaniesPagination (client component)
```

**Current Features:**

- Server-side rendering (SSR) with streaming
- Suspense boundaries for loading states
- URL-based pagination (`?page=N`)
- Dark/light mode toggle

**Deferred Features:**

- Search input (UI ready, backend not connected)
- Filters (batch, hiring, location, tags)
- Infinite scroll (cursor pagination backend exists)
- Optimistic updates
- Real-time data sync

---

## E) Database: Neon Postgres (Serverless)

**Connection Pattern:**

```typescript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
```

**Key Properties:**

- Serverless driver (works in edge/serverless environments)
- Connection pooling built-in
- Auto-scaling compute
- Single database instance (no read replicas yet)

**Migration Management:**

- SQL files in `db/migrations/`
- Run via: `npm run db:migrate` (`tsx scripts/run-migration.ts`)
- Manual execution (no migration framework like Drizzle/Prisma)

**Indexes (Optimization for Read-Heavy Workload):**

```sql
idx_companies_source         ON companies(source)
idx_companies_is_hiring      ON companies(is_hiring) WHERE is_hiring = true
idx_companies_tags           ON companies USING GIN(tags jsonb_path_ops)
idx_companies_name_trgm      ON companies USING GIN(name gin_trgm_ops)
```

**Future Needs:**

- Full-text search index (tsvector for descriptions)
- Vector embeddings column for semantic search
- Indexes on batch, regions, industries

---

## F) Search Architecture (Planned, Not Implemented)

**Current State:** No search functionality. UI shows all companies with pagination only.

**Planned Approach:**

### 1. Filter Extraction (Deterministic)

Parse structured filters from query:

- Batch: "W24", "Winter 2024", "2024" → normalized
- Boolean: "hiring", "nonprofit"
- Geographic: locations/regions
- Industry/tags

### 2. Lexical Search (Postgres Full-Text)

```sql
WHERE
  to_tsvector('english', name || ' ' || one_liner || ' ' || long_description)
  @@ plainto_tsquery('english', $query)
ORDER BY ts_rank(...)
```

**Weighted fields:**

- A-weight: name, one_liner (highest)
- B-weight: tags, industries
- C-weight: long_description
- D-weight: locations

### 3. Semantic Search (Future)

- Store embeddings: `vector(1536)` column (OpenAI ada-002)
- Query: `ORDER BY embedding <=> $query_embedding`
- Hybrid ranking: RRF (reciprocal rank fusion) of lexical + semantic

**Implementation Priority:**

1. Lexical search (GIN index ready)
2. Basic filters (batch, is_hiring)
3. Semantic search (requires embedding generation pipeline)

---

## G) Research Agent (Not Implemented)

**Original Plan:** Autonomous crawler with budget controls, artifact storage, and claim extraction.

**Current Status:** Not started. YC data is sufficient for MVP.

**Deferred Architecture:**

- Job orchestration (task queue, retries)
- Artifact storage (S3/Vercel Blob for HTML/PDFs)
- Knowledge graph (claims with provenance)
- Frontier crawling (priority queue, domain politeness)
- Browser automation (Playwright/Puppeteer)

**When to Implement:**
User feedback indicates need for:

- Company research beyond YC metadata
- Funding round tracking
- Hiring signal detection
- Competitive analysis

---

## H) Infrastructure: Managed Services, Zero DevOps

**Current Stack:**

- **Compute:** Vercel (Next.js hosting, edge functions)
- **Database:** Neon (managed Postgres)
- **Storage:** None yet (no artifacts/uploads)
- **Secrets:** dotenvx (local), Vercel env vars (production)

**Cost Profile (MVP):**

- Vercel: Free tier (hobby)
- Neon: Free tier (compute + storage)
- Total: $0/month

**Deployment:**

- `git push` → Vercel auto-deploy
- Migrations: manual run via scripts
- Data sync: manual trigger of ingestion script

**Future Infra Needs:**

- Object storage (artifacts): Vercel Blob or S3
- Queue/jobs: Vercel Cron + Postgres as queue
- Observability: Vercel Analytics + logs
- Rate limiting: Vercel Edge Middleware

---

## I) Security & Operational Guardrails

**Current Implementation:**

✅ **Implemented:**

- Environment variable validation (`DATABASE_URL` check)
- Input validation (Zod schemas)
- SQL injection protection (parameterized queries via Neon driver)
- Error handling with fallbacks
- Batch processing with error tolerance (10% threshold)

⏸️ **Deferred:**

- Rate limiting (no API auth yet)
- User quotas (no multi-user system)
- SSRF protection (no user-submitted URLs)
- Artifact sandboxing (no artifacts)
- Audit logging

**When Needed:**

- Add rate limiting when exposing public API
- Implement quotas when adding research agent (cost control)
- Sandbox execution when crawling user-submitted domains

---

## J) Design System: Linear-Inspired UI

**Implementation:**

- Custom design tokens (colors, spacing, typography, motion)
- Location: `src/lib/design-system/tokens/`
- Tailwind config: extends with custom scales
- Component library: `src/components/ui/` (Button, Card, Badge, etc.)

**Key Patterns:**

- Token-first development (no hardcoded values)
- Precise typography (negative letter spacing, specific weights)
- Smooth micro-interactions (`active:scale-[0.97]`)
- Background layering (primary → quaternary for depth)

**Documented in:**

- `.agents/skills/linear-design-system/SKILL.md`
- Component templates in `COMPONENTS.md`
- Token reference in `TOKENS.md`

---

## K) Performance Optimizations

**Current Patterns (from react-best-practices skill):**

✅ **Implemented:**

- Server Components for data fetching (eliminates client waterfalls)
- React `cache()` for request deduplication
- Next.js `unstable_cache()` for persistent caching
- Parallel data fetching (`Promise.all` for companies + count)
- Suspense boundaries for streaming

⏸️ **Not Yet Applied:**

- Dynamic imports for code splitting
- Image optimization (no images yet beyond logos)
- Bundle analysis
- Preloading critical resources
- Service worker/offline support

---

## L) Current Limitations & Known Gaps

1. **No Search:** Users must manually page through companies
2. **No Filters:** Cannot narrow by batch, location, hiring status
3. **Static Data:** No refresh mechanism (manual script run)
4. **Single Source:** Only YC data (no Crunchbase, LinkedIn, etc.)
5. **No Research:** No crawling or enrichment beyond YC API
6. **No Auth:** Public read-only, no user accounts
7. **No Analytics:** No tracking of searches, views, clicks

---

## M) Migration Path: From MVP to Full Vision

**Phase 1 (Current): Browse YC Companies**

- ✅ Ingest YC data
- ✅ Display with pagination
- ✅ Basic UI with design system

**Phase 2: Search & Filter**

- Add full-text search (Postgres `tsvector`)
- Implement filters (batch, hiring, location, tags)
- Add search result relevance tuning

**Phase 3: Multi-Source Enrichment**

- Add Crunchbase ingestion
- Integrate HN mentions
- Manual curation tools

**Phase 4: Research Agent**

- Implement job orchestration
- Add artifact storage
- Build claim extraction pipeline
- Deploy crawler with budget controls

**Phase 5: Collaboration Features**

- User accounts & saved searches
- Shared company lists
- Notes and annotations
- Team workspaces

---

## N) Data Model Evolution Path

**Current:** Single `companies` table

**Next:** Add search index

```sql
ALTER TABLE companies
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', name), 'A') ||
  setweight(to_tsvector('english', coalesce(one_liner, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(long_description, '')), 'C')
) STORED;

CREATE INDEX idx_companies_search ON companies USING GIN(search_vector);
```

**Future:** Multi-layer model

```sql
artifacts (
  id, url, content_type, fetched_at,
  content_hash, storage_key, status
)

claims (
  id, artifact_id, subject, predicate, object,
  confidence, extractor_version, evidence_snippet
)

jobs (
  id, company_id, user_id, status,
  budgets JSONB, created_at, completed_at
)

tasks (
  id, job_id, type, url, status,
  retry_count, error_reason
)
```

---

## O) Tech Stack Summary

| Layer           | Technology               | Rationale                                      |
| --------------- | ------------------------ | ---------------------------------------------- |
| Framework       | Next.js 16 (App Router)  | RSC, streaming, server actions, edge-ready     |
| Runtime         | Node.js (Vercel)         | Managed, auto-scaling, zero-config             |
| Database        | Neon Postgres            | Serverless, branching, cost-effective          |
| Driver          | @neondatabase/serverless | Works in edge/serverless                       |
| Styling         | Tailwind CSS             | Utility-first, design tokens, fast iteration   |
| Components      | Radix UI + shadcn/ui     | Accessible primitives, customizable            |
| Validation      | Zod                      | Type-safe schemas, runtime checks              |
| State           | React Query (TanStack)   | Client mutations, optimistic updates (planned) |
| Theme           | next-themes              | SSR-safe dark mode                             |
| Package Manager | npm                      | Standard, well-supported                       |

**Conspicuously Absent:**

- ORM (Drizzle/Prisma): Direct SQL with Neon driver
- API Framework: Server Actions instead of REST/GraphQL
- State Management: Server state + URL state, no Redux/Zustand
- Testing: Not yet implemented

---

## P) Development Workflow

**Local Development:**

```bash
npm run dev              # Start Next.js dev server
npm run db:migrate       # Run migrations
npm run db:ingest-yc     # Sync YC data
npm run db:test          # Test queries
```

**Environment Variables:**

```
DATABASE_URL=postgresql://...  # Neon connection string
```

**Deployment:**

- Push to `main` → Vercel auto-deploy
- Migrations: manual run in production (future: GitHub Actions)
- Data sync: manual trigger (future: Vercel Cron)

---

## Q) Open Questions & Decision Points

1. **Search Implementation Timeline**
    - Block on filters or ship semantic search first?
    - Use Postgres vectors or external service (Pinecone, Qdrant)?

2. **Data Refresh Strategy**
    - Daily cron? Webhook-triggered? On-demand?
    - Delta sync or full upsert?

3. **Multi-Source Priority**
    - Crunchbase (funding data) vs. LinkedIn (hiring signals) vs. HN (community interest)?

4. **Research Agent Scope**
    - Focus on funding rounds, hiring pages, or general company research?
    - Budget per company (pages, time, cost)?

5. **Monetization Model**
    - Free tier limits?
    - Usage-based pricing for research agent?
    - Team/enterprise features?

---

**Last Updated:** January 24, 2026  
**Implementation Status:** Phase 1 (MVP) Complete  
**Next Milestone:** Search & Filter (Phase 2)
