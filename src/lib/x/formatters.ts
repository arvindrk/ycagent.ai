import { XPost, XSearchResult, XGetUserResult } from '@/types/x.types';

function postUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

function extractPosts(rawTweets: Record<string, unknown>[]): XPost[] {
  return rawTweets.map((t) => {
    const metrics = (t.publicMetrics || t.public_metrics || {}) as Record<string, number>;
    const entities = (t.entities || {}) as Record<string, unknown>;
    const hashtags = ((entities.hashtags as Record<string, string>[]) || []).map((h) => `#${h.tag || h.text || ''}`).filter(Boolean);
    const urls = ((entities.urls as Record<string, string>[]) || [])
      .map((u) => u.expandedUrl || u.expanded_url || '')
      .filter((u) => u && !u.startsWith('https://t.co'));
    const referenced = (t.referencedTweets || t.referenced_tweets || []) as Record<string, string>[];
    const contextAnnotations = (t.contextAnnotations || t.context_annotations || []) as Record<string, Record<string, string>>[];
    const contextTopics = contextAnnotations
      .map((a) => a.domain?.name).filter((n): n is string => Boolean(n));

    return {
      id: String(t.id || ''),
      text: String(t.text || ''),
      createdAt: String(t.createdAt || t.created_at || ''),
      url: postUrl(String(t.id || '')),
      lang: t.lang ? String(t.lang) : undefined,
      likeCount: metrics.likeCount ?? metrics.like_count ?? 0,
      retweetCount: metrics.retweetCount ?? metrics.retweet_count ?? 0,
      replyCount: metrics.replyCount ?? metrics.reply_count ?? 0,
      quoteCount: metrics.quoteCount ?? metrics.quote_count ?? 0,
      hashtags,
      expandedUrls: urls,
      referencedType: referenced[0]?.type as XPost['referencedType'] | undefined,
      contextTopics: [...new Set(contextTopics)],
    };
  });
}

function renderPost(post: XPost, index: number): string {
  const lines: string[] = [
    `[Post ${index + 1}] ${post.createdAt}`,
    post.text,
    `Engagement: ${post.likeCount} likes · ${post.retweetCount} reposts · ${post.replyCount} replies · ${post.quoteCount} quotes`,
    `URL: ${post.url}`,
  ];
  if (post.referencedType) lines.push(`Type: ${post.referencedType}`);
  if (post.hashtags.length) lines.push(`Hashtags: ${post.hashtags.join(' ')}`);
  if (post.expandedUrls.length) lines.push(`Links: ${post.expandedUrls.join(', ')}`);
  if (post.contextTopics.length) lines.push(`Topics: ${post.contextTopics.join(', ')}`);
  return lines.join('\n');
}

export function formatSearchResults(result: XSearchResult): string {
  if (result.posts.length === 0) {
    return `No posts found for query: "${result.query}"`;
  }

  const header = `X Search: "${result.query}" — ${result.posts.length} result(s)`;
  const body = result.posts.map((p, i) => renderPost(p, i)).join('\n\n---\n\n');
  return [header, '', body].join('\n');
}

export function formatUserResult(result: XGetUserResult): string {
  const { profile, posts, mentions } = result;

  const profileSection = [
    `## @${profile.username} — ${profile.name}`,
    profile.bio || '(no bio)',
    '',
    `Website: ${profile.websiteUrl || 'N/A'}`,
    `Location: ${profile.location || 'N/A'}`,
    `Joined: ${profile.joinedDate}`,
    `Verified: ${profile.verified ? `Yes (${profile.verifiedType})` : 'No'} | X Blue: ${profile.subscriptionType}`,
    `Followers: ${profile.followersCount.toLocaleString()} | Tweets: ${profile.tweetCount.toLocaleString()} | Listed: ${profile.listedCount.toLocaleString()}`,
    `Profile image: ${profile.profileImageUrl || 'N/A'}`,
  ].join('\n');

  const postsSection = posts.length > 0
    ? `## Recent Posts (${posts.length})\n\n${posts.map((p, i) => renderPost(p, i)).join('\n\n---\n\n')}`
    : '## Recent Posts\n\n(none)';

  const mentionsSection = mentions.length > 0
    ? `## Recent Mentions (${mentions.length})\n\n${mentions.map((p, i) => renderPost(p, i)).join('\n\n---\n\n')}`
    : '## Recent Mentions\n\n(none)';

  return [profileSection, '', postsSection, '', mentionsSection].join('\n');
}

export { extractPosts };
