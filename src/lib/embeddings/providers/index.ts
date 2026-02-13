import { EmbeddingProvider, type BaseEmbeddingProvider, type EmbeddingConfig } from '@/types/embedding.types';
import { OpenAIEmbeddingProvider } from './openai';

export function getEmbeddingProvider(
  config: EmbeddingConfig
): BaseEmbeddingProvider {
  switch (config.provider) {
    case EmbeddingProvider.OPENAI:
      return new OpenAIEmbeddingProvider(config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}
