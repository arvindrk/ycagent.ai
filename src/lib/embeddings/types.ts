/**
 * Vendor-agnostic embedding provider interface
 * Allows easy swapping between OpenAI, Cohere, Anthropic, local models, etc.
 */
export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'anthropic' | 'local';
  dimensions: 768;
  model?: string;
  apiKey?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  provider: string;
}

export interface Company {
  id?: string;
  name: string;
  one_liner: string | null;
  long_description: string | null;
  tags: string[];
  industries: string[];
  all_locations: string | null;
  batch: string | null;
}
