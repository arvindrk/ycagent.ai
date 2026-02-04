import { z } from 'zod';

// Balanced schema: URLs + essential metadata
export const YC_JSON_SCHEMA = {
  type: "object",
  properties: {
    company_basic: {
      type: "object",
      properties: {
        name: { type: "string" },
        website: { type: "string" },
        batch: { type: "string" },
        primary_partner: { type: "string" }
      }
    },
    founders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          bio: { type: "string" },
          twitter: { type: "string" },
          linkedin: { type: "string" },
          github: { type: "string" },
          personal_website: { type: "string" },
          avatar_url: { type: "string" },
          other_urls: { type: "array", items: { type: "string" } }
        }
      }
    },
    latest_news: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          url: { type: "string" },
          source: { type: "string" }
        }
      }
    },
    launches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          url: { type: "string" }
        }
      }
    },
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          location: { type: "string" },
          url: { type: "string" }
        }
      }
    },
    social_links: {
      type: "object",
      properties: {
        linkedin: { type: "string" },
        twitter: { type: "string" },
        github: { type: "string" },
        blog: { type: "string" },
        documentation: { type: "string" },
        discord: { type: "string" },
        youtube: { type: "string" }
      }
    },
    image_urls: {
      type: "array",
      items: { type: "string" },
      description: "Company logos, product screenshots, other images"
    },
    additional_urls: {
      type: "array",
      items: { type: "string" },
      description: "Any other URLs found on the page"
    }
  }
} as const;

// Helper to validate URLs - transforms invalid URLs to undefined instead of throwing
const urlOrUndefined = z.string().optional().transform((val) => {
  if (!val || val.trim() === '') return undefined;
  try {
    new URL(val);
    return val;
  } catch {
    return undefined;
  }
});

// Helper to filter out invalid URLs from arrays
const urlArrayFiltered = z.array(z.string()).optional().transform((arr) => {
  if (!arr) return undefined;
  return arr.filter(url => {
    if (!url || url.trim() === '') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
});

export const ycCompanyExtractionSchema = z.object({
  company_basic: z.object({
    name: z.string(),
    website: urlOrUndefined,
    batch: z.string().optional(),
    primary_partner: z.string().optional(),
  }),
  founders: z.array(z.object({
    name: z.string(),
    twitter: urlOrUndefined,
    linkedin: urlOrUndefined,
    github: urlOrUndefined,
    personal_website: urlOrUndefined,
    avatar_url: urlOrUndefined,
    other_urls: urlArrayFiltered,
  })).optional(),
  latest_news: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    url: urlOrUndefined,
    source: z.string().optional(),
  })).optional(),
  launches: z.array(z.object({
    title: z.string(),
    date: z.string().optional(),
    url: urlOrUndefined,
  })).optional(),
  jobs: z.array(z.object({
    title: z.string(),
    location: z.string().optional(),
    url: urlOrUndefined,
  })).optional(),
  social_links: z.object({
    linkedin: urlOrUndefined,
    twitter: urlOrUndefined,
    github: urlOrUndefined,
    blog: urlOrUndefined,
    documentation: urlOrUndefined,
    discord: urlOrUndefined,
    youtube: urlOrUndefined,
  }).optional(),
  image_urls: urlArrayFiltered,
  additional_urls: urlArrayFiltered,
});

export type YcCompanyExtraction = z.infer<typeof ycCompanyExtractionSchema>;

export function getAllUrls(data: YcCompanyExtraction): string[] {
  const urls: string[] = [];

  if (data.company_basic.website) urls.push(data.company_basic.website);

  data.founders?.forEach(founder => {
    if (founder.twitter) urls.push(founder.twitter);
    if (founder.linkedin) urls.push(founder.linkedin);
    if (founder.github) urls.push(founder.github);
    if (founder.personal_website) urls.push(founder.personal_website);
    if (founder.avatar_url) urls.push(founder.avatar_url);
    if (founder.other_urls) urls.push(...founder.other_urls);
  });

  data.latest_news?.forEach(news => {
    if (news.url) urls.push(news.url);
  });

  data.launches?.forEach(launch => {
    if (launch.url) urls.push(launch.url);
  });

  data.jobs?.forEach(job => {
    if (job.url) urls.push(job.url);
  });

  const social = data.social_links;
  if (social?.linkedin) urls.push(social.linkedin);
  if (social?.twitter) urls.push(social.twitter);
  if (social?.github) urls.push(social.github);
  if (social?.blog) urls.push(social.blog);
  if (social?.documentation) urls.push(social.documentation);
  if (social?.discord) urls.push(social.discord);
  if (social?.youtube) urls.push(social.youtube);

  if (data.image_urls) urls.push(...data.image_urls);
  if (data.additional_urls) urls.push(...data.additional_urls);

  return [...new Set(urls)];
}
