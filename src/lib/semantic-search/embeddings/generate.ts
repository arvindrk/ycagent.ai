import { cache } from 'react';
import { getEmbeddingProvider } from '../../embeddings/providers';

const DEFAULT_EMBEDDING_CONFIG = {
  provider: 'openai',
  dimensions: 768,
} as const;

const embeddingProvider = getEmbeddingProvider(DEFAULT_EMBEDDING_CONFIG);

export const generateEmbedding = cache(async (text: string): Promise<number[]> => {
  return embeddingProvider.generate(text);
});

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  return embeddingProvider.generateBatch(texts);
}
