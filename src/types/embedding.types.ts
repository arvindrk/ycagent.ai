export interface BaseEmbeddingProvider {
  name: string;
  dimensions: number;
  generate(text: string, signal?: AbortSignal): Promise<number[]>;
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
