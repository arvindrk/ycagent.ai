import { XProvider } from '@/types/x.types';

export class XError extends Error {
  constructor(message: string, public provider: XProvider) {
    super(message);
    this.name = 'XError';
  }
}

export class XRateLimitError extends XError {
  constructor(provider: XProvider) {
    super('X API rate limit exceeded', provider);
    this.name = 'XRateLimitError';
  }
}

export class XAuthenticationError extends XError {
  constructor(provider: XProvider) {
    super('X API authentication failed — check X_API_BEARER_TOKEN', provider);
    this.name = 'XAuthenticationError';
  }
}
