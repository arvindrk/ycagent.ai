export const DEFAULT_EMBEDDING_CONFIG = {
    provider: 'openai',
    dimensions: 768,
} as const;

export const HNSW_CONFIG = {
    EF_SEARCH: 200,
} as const;