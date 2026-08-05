import { cache } from 'react';
import { getEmbeddingProvider } from '../../embeddings/providers';
import {
  DEFAULT_EMBEDDING_CONFIG,
  EMBEDDING_DEADLINE_MS,
  EMBEDDING_MAX_ATTEMPTS,
  EMBEDDING_RETRY_DELAY_MS,
} from '@/constants/embedding.constants';
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

/** Raised when the caller aborted, so callers can tell it apart from a provider fault. */
export class EmbeddingAbortedError extends Error {
  constructor() {
    super('Embedding request aborted by the caller');
    this.name = 'EmbeddingAbortedError';
  }
}

export interface BestEffortEmbedding {
  embedding: number[] | null;
  /** Provider fault message, server-side only. Never send this to a client. */
  failureReason?: string;
}

/**
 * Embedding for the search path, treated as an optional ranking input.
 * Returns a null embedding on provider fault or timeout so search can fall back
 * to lexical ranking instead of failing the request. A caller abort still
 * throws, because there is no response left to degrade.
 */
export async function generateEmbeddingBestEffort(
  text: string,
  callerSignal?: AbortSignal,
): Promise<BestEffortEmbedding> {
  const deadline = Date.now() + EMBEDDING_DEADLINE_MS;
  let lastFailure = 'unknown embedding failure';

  for (let attempt = 1; attempt <= EMBEDDING_MAX_ATTEMPTS; attempt++) {
    if (callerSignal?.aborted) throw new EmbeddingAbortedError();

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const timeout = AbortSignal.timeout(remaining);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeout])
      : timeout;

    try {
      return { embedding: await generateEmbedding(text, signal) };
    } catch (error) {
      if (callerSignal?.aborted) throw new EmbeddingAbortedError();
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    if (attempt < EMBEDDING_MAX_ATTEMPTS && deadline - Date.now() > EMBEDDING_RETRY_DELAY_MS) {
      await new Promise(resolve => setTimeout(resolve, EMBEDDING_RETRY_DELAY_MS));
    }
  }

  return { embedding: null, failureReason: lastFailure };
}
