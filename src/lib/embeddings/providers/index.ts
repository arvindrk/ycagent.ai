import type { EmbeddingProvider, EmbeddingConfig } from '../types';
import { OpenAIEmbeddingProvider } from './openai';

export function getEmbeddingProvider(
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}
