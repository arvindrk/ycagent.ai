import OpenAI from 'openai';
import type { EmbeddingProvider, EmbeddingConfig } from '../types';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 768;
  private client: OpenAI;
  private model: string;

  constructor(config: EmbeddingConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions;
  }

  async generate(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    });

    return response.data[0].embedding;
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    if (texts.length > 2048) {
      throw new Error('OpenAI batch size cannot exceed 2048');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data.map((item) => item.embedding);
  }
}
