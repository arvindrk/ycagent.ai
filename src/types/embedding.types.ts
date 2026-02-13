export interface BaseEmbeddingProvider {
  name: string;
  dimensions: number;
  generate(text: string): Promise<number[]>;
  generateBatch(texts: string[]): Promise<number[][]>;
}

export enum EmbeddingProvider {
  OPENAI = 'openai'
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
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
