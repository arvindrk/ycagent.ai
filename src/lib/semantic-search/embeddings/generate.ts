import { cache } from 'react';
import { getEmbeddingProvider } from '../../embeddings/providers';
import { DEFAULT_EMBEDDING_CONFIG } from '@/constants/embedding.constants';

const embeddingProvider = getEmbeddingProvider(DEFAULT_EMBEDDING_CONFIG);

export const generateEmbedding = cache(async (text: string, signal?: AbortSignal): Promise<number[]> => {
  return embeddingProvider.generate(text, signal);
});

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  return embeddingProvider.generateBatch(texts);
}
