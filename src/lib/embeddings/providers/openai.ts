import OpenAI from 'openai';
import { EmbeddingProvider, type BaseEmbeddingProvider, type EmbeddingConfig } from '@/types/embedding.types';

export class OpenAIEmbeddingProvider implements BaseEmbeddingProvider {
  name = EmbeddingProvider.OPENAI;
  dimensions = 768;
  private client: OpenAI | null = null;
  private apiKey?: string;
  private model: string;

  constructor(config: EmbeddingConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions;
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey || process.env.OPENAI_API_KEY,
      });
    }

    return this.client;
  }

  async generate(text: string, signal?: AbortSignal): Promise<number[]> {
    const response = await this.getClient().embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    }, {
      signal,
    });

    return response.data[0].embedding;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    if (texts.length > 2048) {
      throw new Error('OpenAI batch size cannot exceed 2048');
    }

    const response = await this.getClient().embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data.map((item) => item.embedding);
  }
}
