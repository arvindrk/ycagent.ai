import type { EmbeddingProvider, EmbeddingConfig } from '../types';
import { OpenAIEmbeddingProvider } from './openai';

/**
 * Factory function to get embedding provider
 * Makes it easy to swap providers by changing config
 */
export function getEmbeddingProvider(
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider(config);
    // Future providers:
    // case 'cohere': return new CohereEmbeddingProvider(config);
    // case 'anthropic': return new AnthropicEmbeddingProvider(config);
    // case 'local': return new LocalModelProvider(config);
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}
