# Database Setup Guide

## Prerequisites

1. Create a Neon database at https://neon.tech
2. Copy your connection string

## Setup Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` and add your Neon connection string:

```
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

### 3. Run migration

```bash
npm run db:migrate
```

This creates the `companies` table with indexes.

### 4. Ingest YC companies

```bash
npm run db:ingest-yc
```

This fetches all ~5,600 YC companies and loads them into your database.

## Expected Output

```
Fetching YC companies from API...
Fetched 5644 companies
Upserting 5644 companies...
Progress: 100/5644 companies upserted
Progress: 200/5644 companies upserted
...
Upsert complete: 5644 successful, 0 failed

Total YC companies in database: 5644

✅ Ingestion completed successfully!
```

## Verify Data

Connect to your Neon database and run:

```sql
-- Total count
SELECT COUNT(*) FROM companies;

-- Sample companies
SELECT name, batch, is_hiring, array_length(tags::text[]::jsonb, 1) as tag_count
FROM companies
LIMIT 10;

-- Companies by batch
SELECT batch, COUNT(*)
FROM companies
WHERE source = 'yc'
GROUP BY batch
ORDER BY batch DESC
LIMIT 10;

-- Hiring companies
SELECT COUNT(*)
FROM companies
WHERE is_hiring = true;
```

## Schema Overview

- **Primary table**: `companies`
- **Indexes**: 4 read-optimized indexes
- **JSONB fields**: `tags`, `industries`, `regions`, `source_metadata`
- **Key filters**: `source`, `batch`, `is_hiring`, `stage`, `status`

## Future Ingestion

To add A16Z or other companies:

1. Create a new script similar to `ingest-yc-companies.ts`
2. Set `source = 'a16z'` and map their fields
3. Run the ingestion script

## Refresh YC Data

Simply re-run:

```bash
npm run db:ingest-yc
```

The upsert logic handles updates automatically.
