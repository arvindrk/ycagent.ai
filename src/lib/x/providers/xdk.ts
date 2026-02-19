import {
  BaseXProvider,
  XConfig,
  XProvider,
  XSearchOptions,
  XSearchResult,
  XGetUserOptions,
  XGetUserResult,
  XUserProfile,
} from '@/types/x.types';
import { getXClient } from '../client';
import { XError, XRateLimitError, XAuthenticationError } from '../errors';
import { extractPosts } from '../formatters';

const TWEET_FIELDS = [
  'id', 'text', 'created_at', 'lang', 'public_metrics',
  'entities', 'context_annotations', 'referenced_tweets',
  'in_reply_to_user_id', 'possibly_sensitive',
];

const USER_FIELDS = [
  'id', 'name', 'username', 'description', 'url', 'created_at',
  'location', 'verified', 'verified_type', 'subscription_type',
  'affiliation', 'public_metrics', 'pinned_tweet_id', 'protected',
  'profile_image_url', 'profile_banner_url', 'entities',
];

const EXPANSIONS = ['author_id'];

export class XDKXProvider implements BaseXProvider {
  name = XProvider.XDK;
  private bearerToken?: string;

  constructor(config?: XConfig) {
    this.bearerToken = config?.bearerToken;
  }

  async searchPosts(query: string, options?: XSearchOptions): Promise<XSearchResult> {
    try {
      const client = getXClient(this.bearerToken);
      const maxResults = Math.min(Math.max(options?.maxResults ?? 20, 10), 100);

      const response = await client.posts.searchRecent(query, {
        maxResults,
        sortOrder: options?.sortOrder ?? 'relevancy',
        tweetFields: TWEET_FIELDS,
        userFields: USER_FIELDS,
        expansions: EXPANSIONS,
      });

      const rawTweets = (response.data || []) as Record<string, unknown>[];

      return {
        query,
        provider: this.name,
        posts: extractPosts(rawTweets),
        totalFound: rawTweets.length,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUser(username: string, options?: XGetUserOptions): Promise<XGetUserResult> {
    try {
      const profile = await this.getUserByUsername(username);
      const [posts, mentions] = await Promise.all([
        this.getUserPosts(profile.id, options?.maxPosts ?? 10),
        this.getUserMentions(profile.id, options?.maxMentions ?? 10),
      ]);

      return {
        provider: this.name,
        profile,
        posts,
        mentions,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async getUserByUsername(username: string): Promise<XUserProfile> {
    const client = getXClient(this.bearerToken);
    const response = await client.users.getByUsername(username, {
      userFields: USER_FIELDS,
    });

    const u = response.data as unknown as Record<string, unknown>;
    if (!u) throw new XError(`User @${username} not found`, this.name);

    return this.mapUserProfile(u);
  }

  private async getUserPosts(userId: string, maxResults: number): Promise<ReturnType<typeof extractPosts>> {
    const client = getXClient(this.bearerToken);
    const response = await client.users.getPosts(userId, {
      maxResults: Math.min(maxResults, 50),
      tweetFields: TWEET_FIELDS,
      userFields: USER_FIELDS,
      expansions: EXPANSIONS,
    });

    return extractPosts((response.data || []) as Record<string, unknown>[]);
  }

  private async getUserMentions(userId: string, maxResults: number): Promise<ReturnType<typeof extractPosts>> {
    const client = getXClient(this.bearerToken);
    const response = await client.users.getMentions(userId, {
      maxResults: Math.min(maxResults, 50),
      tweetFields: TWEET_FIELDS,
      userFields: USER_FIELDS,
      expansions: EXPANSIONS,
    });

    return extractPosts((response.data || []) as Record<string, unknown>[]);
  }

  private mapUserProfile(u: Record<string, unknown>): XUserProfile {
    const metrics = (u.publicMetrics || u.public_metrics || {}) as Record<string, number>;
    const entities = (u.entities || {}) as Record<string, unknown>;
    const urlEntities = (entities.url as Record<string, Record<string, string>[]> | undefined)?.urls || [];
    const websiteUrl = urlEntities[0]?.expandedUrl || urlEntities[0]?.expanded_url || String(u.url || '');

    return {
      id: String(u.id || ''),
      name: String(u.name || ''),
      username: String(u.username || ''),
      bio: String(u.description || ''),
      websiteUrl,
      location: String(u.location || ''),
      joinedDate: String(u.createdAt || u.created_at || ''),
      verified: Boolean(u.verified),
      verifiedType: String(u.verifiedType || u.verified_type || 'none'),
      subscriptionType: String(u.subscriptionType || u.subscription_type || 'None'),
      followersCount: metrics.followersCount ?? metrics.followers_count ?? 0,
      tweetCount: metrics.tweetCount ?? metrics.tweet_count ?? 0,
      listedCount: metrics.listedCount ?? metrics.listed_count ?? 0,
      profileImageUrl: String(u.profileImageUrl || u.profile_image_url || ''),
    };
  }

  private handleError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as Record<string, unknown>)?.status as number | undefined;

    if (status === 429 || message.toLowerCase().includes('rate limit')) {
      return new XRateLimitError(this.name);
    }
    if (status === 401 || status === 403 || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('forbidden')) {
      return new XAuthenticationError(this.name);
    }
    return new XError(message || 'Unknown X API error', this.name);
  }
}
