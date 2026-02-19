export enum XProvider {
  XDK = 'xdk',
}

export interface XConfig {
  provider?: XProvider;
  bearerToken?: string;
}

export interface XSearchOptions {
  maxResults?: number;
  sortOrder?: 'recency' | 'relevancy';
}

export interface XGetUserOptions {
  maxPosts?: number;
  maxMentions?: number;
}

export interface XPost {
  id: string;
  text: string;
  createdAt: string;
  url: string;
  lang?: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  hashtags: string[];
  expandedUrls: string[];
  referencedType?: 'retweeted' | 'quoted' | 'replied_to';
  contextTopics: string[];
}

export interface XUserProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  websiteUrl: string;
  location: string;
  joinedDate: string;
  verified: boolean;
  verifiedType: string;
  subscriptionType: string;
  followersCount: number;
  tweetCount: number;
  listedCount: number;
  profileImageUrl: string;
}

export interface XSearchResult {
  query: string;
  provider: XProvider;
  posts: XPost[];
  totalFound: number;
}

export interface XGetUserResult {
  provider: XProvider;
  profile: XUserProfile;
  posts: XPost[];
  mentions: XPost[];
}

export interface BaseXProvider {
  name: XProvider;
  searchPosts(query: string, options?: XSearchOptions): Promise<XSearchResult>;
  getUser(username: string, options?: XGetUserOptions): Promise<XGetUserResult>;
}
