export class CrawlerError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string
  ) {
    super(message);
    this.name = 'CrawlerError';
  }
}

export class RateLimitError extends CrawlerError {
  constructor(provider: string, public retryAfter?: number) {
    super(
      `Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      provider,
      'RATE_LIMIT'
    );
    this.name = 'RateLimitError';
  }
}

export class InvalidUrlError extends CrawlerError {
  constructor(public url: string, provider: string) {
    super(`Invalid URL: ${url}`, provider, 'INVALID_URL');
    this.name = 'InvalidUrlError';
  }
}

export class AuthenticationError extends CrawlerError {
  constructor(provider: string) {
    super('Authentication failed - check API key', provider, 'AUTH_FAILED');
    this.name = 'AuthenticationError';
  }
}
