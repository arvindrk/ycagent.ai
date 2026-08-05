import { EmbeddingProvider } from "@/types/embedding.types";

export const DEFAULT_EMBEDDING_CONFIG = {
    provider: EmbeddingProvider.OPENAI,
    dimensions: 768,
} as const;

export const HNSW_CONFIG = {
    EF_SEARCH: 200,
} as const;

/**
 * Search stays interactive when the embedding provider is slow or down, so the
 * whole embedding step shares one deadline across attempts rather than giving
 * each retry its own timeout.
 */
export const EMBEDDING_DEADLINE_MS = 4000;
export const EMBEDDING_MAX_ATTEMPTS = 2;
export const EMBEDDING_RETRY_DELAY_MS = 150;