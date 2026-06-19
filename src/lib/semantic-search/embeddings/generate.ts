import { cache } from 'react';
import { getEmbeddingProvider } from '../../embeddings/providers';
import { DEFAULT_EMBEDDING_CONFIG } from '@/constants/embedding.constants';
import type { BaseEmbeddingProvider } from '@/types/embedding.types';

let embeddingProvider: BaseEmbeddingProvider | null = null;

function getDefaultEmbeddingProvider(): BaseEmbeddingProvider {
  if (!embeddingProvider) {
    embeddingProvider = getEmbeddingProvider(DEFAULT_EMBEDDING_CONFIG);
  }

  return embeddingProvider;
}

export const generateEmbedding = cache(async (text: string, signal?: AbortSignal): Promise<number[]> => {
  return getDefaultEmbeddingProvider().generate(text, signal);
});

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  return getDefaultEmbeddingProvider().generateBatch(texts);
}
