import { EmbeddingProvider } from "@/types/embedding.types";

export const DEFAULT_EMBEDDING_CONFIG = {
    provider: EmbeddingProvider.OPENAI,
    dimensions: 768,
} as const;

export const HNSW_CONFIG = {
    EF_SEARCH: 200,
} as const;