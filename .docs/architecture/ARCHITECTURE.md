# Architecture and System Design

**YC Search Platform - Current Implementation (v1.0)**

## Overview

A Next.js-based semantic search platform for Y Combinator companies. The implementation features hybrid search (semantic + lexical + name matching) with tiered confidence results, using a single normalized company table with vector embeddings.

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

- Single source of truth for all company data
- No joins required for search or display
- Adequate for current scale (5,600+ companies)
- Vector embeddings stored directly in company table
- Simple and maintainable architecture

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
- Semantic search with debounced input
- Tiered results display (accordion UI)
- Company detail pages
- Dark/light mode toggle
- Responsive design (Linear design system)

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

- SQL files in `src/lib/db/migrations/`
- Run via: `npm run db:migrate` (`tsx scripts/run-migration.ts`)
- Manual execution (no ORM)

**Indexes (Optimized for Search):**

```sql
-- Core indexes
idx_companies_source         ON companies(source)
idx_companies_is_hiring      ON companies(is_hiring) WHERE is_hiring = true
idx_companies_tags           ON companies USING GIN(tags jsonb_path_ops)

-- Search indexes
idx_companies_name_trgm      ON companies USING GIN(name gin_trgm_ops)
idx_companies_search         ON companies USING GIN(search_vector)
idx_companies_embedding      ON companies USING ivfflat(embedding vector_cosine_ops)
```

**Extensions:**

- `pgvector` - Vector similarity search
- `pg_trgm` - Trigram matching for fuzzy search

---

## F) Search Architecture (Implemented)

**Current State:** Production-ready hybrid search with tiered confidence results.

### Implementation

Single SQL query combining three search methods:

1. **Semantic Search** - Vector similarity using pgvector
   - OpenAI embeddings (text-embedding-3-small, 1536 dimensions)
   - Cosine distance: `1 - (embedding <=> query_embedding)`
   - Primary ranking signal (0.8 weight)

2. **Name Matching** - Fuzzy text matching
   - PostgreSQL trigram similarity (`pg_trgm`)
   - Perfect for company name searches
   - Secondary ranking signal (0.15 weight)

3. **Full-Text Search** - Keyword matching
   - PostgreSQL tsvector with `ts_rank_cd`
   - Searches name, description, tags
   - Tertiary ranking signal (0.05 weight)

### Tier System

Results organized into 5 confidence tiers:

| Tier | Criteria | Multiplier | Display |
|------|----------|------------|---------|
| Exact Match | name ≥ 0.9 | 2.5x | 🎯 Purple |
| High Confidence | semantic ≥ 0.7 | 1.5x | ✨ Blue |
| Strong Match | semantic ≥ 0.5 | 1.0x | ✓ Green |
| Relevant | semantic ≥ 0.3 | 0.8x | ○ Gray |
| Keyword Match | fallback | 0.5x | # Light gray |

### Quality Controls

- Minimum semantic score: 0.25 OR name score: 0.7
- Maximum 50 results per query
- Results ordered by final score (base score × tier multiplier)
- Query time: ~400-600ms average

See [SIMPLIFIED_SEARCH.md](SIMPLIFIED_SEARCH.md) for full implementation details.

---

## G) Future Enhancements (Not Planned)

**Current Scope:** Semantic search over YC company data only.

**Potential Future Extensions:**

- Multi-source data (Crunchbase, LinkedIn, HackerNews)
- Advanced filters (batch, location, hiring status, tags)
- User accounts and saved searches
- Real-time data refresh (currently manual sync)
- Company comparison features

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

1. **No Advanced Filters:** Cannot narrow by batch, location, hiring status (semantic search only)
2. **Static Data:** No automatic refresh (manual script run required)
3. **Single Source:** Only YC data (no Crunchbase, LinkedIn, etc.)
4. **No Auth:** Public read-only, no user accounts
5. **No Analytics:** No tracking of searches, views, clicks
6. **No Save/Bookmarks:** Cannot save companies or searches

---

## M) Implementation Milestones

**Phase 1: Data Foundation** ✅ Complete

- ✅ Ingest YC data (5,600+ companies)
- ✅ Generate embeddings (OpenAI text-embedding-3-small)
- ✅ Setup vector search (pgvector)
- ✅ Create search indexes

**Phase 2: Search Implementation** ✅ Complete

- ✅ Hybrid search (semantic + lexical + name)
- ✅ Tiered confidence system
- ✅ Search UI with debouncing
- ✅ Result quality tuning

**Phase 3: UI/UX Polish** ✅ Complete

- ✅ Linear-inspired design system
- ✅ Company detail pages
- ✅ Dark mode support
- ✅ Responsive design

**Future Considerations:**

- Advanced filters (batch, location, hiring)
- Multi-source data integration
- User accounts and saved searches
- Real-time data refresh

---

## N) Data Model (Current State)

**Single Table Architecture:** `companies` table with vector embeddings

```sql
companies (
  -- Core fields
  id, name, slug, website, logo_url, one_liner, long_description,
  
  -- Metadata
  batch, team_size, stage, status, tags, industries, regions,
  
  -- Search columns
  search_vector tsvector,              -- Full-text search
  embedding vector(1536),              -- Semantic search (OpenAI)
  
  -- Provenance
  source, source_id, source_url, source_metadata,
  
  -- Timestamps
  created_at, updated_at, last_synced_at
)
```

**No additional tables.** Simple, maintainable, sufficient for semantic search use case.

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

## Q) Design Decisions & Trade-offs

**1. Why Single Table?**
- Simpler queries (no joins)
- Faster iteration during development
- Adequate for 5,600 companies
- Can scale to 100K+ companies without issues

**2. Why Hybrid Search?**
- Semantic alone misses exact name matches
- Lexical alone misses conceptual matches
- Combination provides best user experience
- Tier system makes relevance transparent

**3. Why No Filters?**
- Semantic search handles most filter needs naturally
- Simpler UI and backend
- Can add structured filters later if needed

**4. Why OpenAI Embeddings?**
- High quality (better than open source)
- Fast inference (<100ms)
- Reasonable cost ($0.13 per 1M tokens)
- One-time generation (no ongoing costs)

**5. Why Neon + pgvector?**
- Managed Postgres (zero ops)
- Native vector support (no external service)
- Low latency (single query)
- Cost-effective (free tier sufficient)

---

**Last Updated:** February 10, 2026  
**Implementation Status:** Production-ready (v1.0)  
**Current Focus:** Monitoring search quality and user feedback
