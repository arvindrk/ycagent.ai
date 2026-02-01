-- Migration: Create companies table
-- Description: Initial schema for storing company data from YC and other sources

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE companies (
    -- Identity & Source Tracking
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    source_id TEXT NOT NULL,
    source_url TEXT,
    
    -- Core Company Info
    name TEXT NOT NULL,
    slug TEXT,
    website TEXT,
    logo_url TEXT,
    
    -- Descriptions
    one_liner TEXT,
    long_description TEXT,
    
    -- Structured Attributes (JSONB arrays for filtering)
    tags JSONB DEFAULT '[]'::jsonb,
    industries JSONB DEFAULT '[]'::jsonb,
    regions JSONB DEFAULT '[]'::jsonb,
    
    -- Common Filters
    batch VARCHAR(50),
    
    -- Numeric/Boolean Filters
    team_size INTEGER,
    founded_at TIMESTAMP,
    stage VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    is_hiring BOOLEAN DEFAULT false,
    is_nonprofit BOOLEAN DEFAULT false,
    
    -- Geographic
    all_locations TEXT,
    
    -- Source-Specific Data
    source_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_synced_at TIMESTAMP DEFAULT NOW(),
    
    -- Uniqueness constraint: one record per source company
    CONSTRAINT unique_source_company UNIQUE(source, source_id)
);

-- Minimal indexes for read-heavy workload
CREATE INDEX idx_companies_source ON companies(source);
CREATE INDEX idx_companies_is_hiring ON companies(is_hiring) WHERE is_hiring = true;
CREATE INDEX idx_companies_tags ON companies USING GIN(tags jsonb_path_ops);
CREATE INDEX idx_companies_name_trgm ON companies USING GIN(name gin_trgm_ops);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at 
BEFORE UPDATE ON companies
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
