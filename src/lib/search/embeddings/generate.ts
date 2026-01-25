import { getEmbeddingProvider } from '../../embeddings/providers';

const embeddingConfig = {
  provider: 'openai' as const,
  dimensions: 768,
};

const embeddingProvider = getEmbeddingProvider(embeddingConfig);

export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddingProvider.generate(text);
}

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  return embeddingProvider.generateBatch(texts);
}
