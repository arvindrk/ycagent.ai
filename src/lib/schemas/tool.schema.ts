import { ToolSchema } from "@/types/tool.types";

export const computerToolSchema: ToolSchema = {
  name: "computer",
  description: "Control desktop computer - navigate, click, type, scroll, screenshot. Coordinates are [x, y] relative to display resolution.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["navigate", "key", "type", "mouse_move", "left_click", "right_click", "double_click", "scroll", "screenshot", "wait"]
      },
      url: { type: "string" },
      text: { type: "string" },
      coordinate: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
      scroll_direction: { type: "string", enum: ["up", "down"] },
      scroll_amount: { type: "number" },
      duration: { type: "number" }
    },
    required: ["action"]
  }
};

export const bashToolSchema: ToolSchema = {
  name: "bash",
  description: "Execute bash commands in the desktop terminal.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      restart: { type: "boolean" }
    }
  }
};

export const googleSearchToolSchema: ToolSchema = {
  name: "google_search",
  description: "Search Google for information. Returns relevant search results with titles, links, and snippets.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query" },
      num_results: { type: "number", description: "Number of results (default: 10)" }
    },
    required: ["query"]
  }
};

export const webCrawlerToolSchema: ToolSchema = {
  name: "web_crawler",
  description: "Primary tool for extracting detailed information. Crawl known sources directly before resorting to google_search. Returns full page markdown content. Choose number of url's to crawl based on relavance. Default limit is 5 URLs per call.",
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Array of URLs to scrape"
      },
      limit: { type: "number", description: "Max URLs to scrape (default: 5, max: 10)" },
      formats: {
        type: "array",
        items: { type: "string", enum: ["markdown", "html", "rawHtml", "links"] },
        description: "Content formats to return (default: ['markdown'])"
      },
      onlyMainContent: { type: "boolean", description: "Extract only main content, skip headers/footers (default: true)" }
    },
    required: ["urls"]
  }
};

export const founderProfileResultToolSchema: ToolSchema = {
  name: 'format_result_founder_profile',
  description: 'Format founder research findings. Call this when you have completed founder research and want to present findings. MUST include all sources/URLs you consulted.',
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        enum: ['founder_profile'],
        description: 'Domain identifier'
      },
      executiveSummary: {
        type: 'string',
        description: 'Single-sentence synthesis of the founding team strength and composition'
      },
      founderRelationship: {
        type: 'array',
        items: { type: 'string' },
        description: 'Bullet points about founder relationships: how long known each other, context of meeting, prior collaboration history, trust indicators',
        minItems: 1,
        maxItems: 3
      },
      complementarySkills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Bullet points about skill complementarity: technical vs business split, domain expertise coverage, skill gaps, experience alignment with problem',
        minItems: 1,
        maxItems: 3
      },
      socialPresence: {
        type: 'array',
        items: { type: 'string' },
        description: 'Bullet points about social media presence and credibility: follower counts, thought leadership, publications, GitHub activity',
        minItems: 1,
        maxItems: 3
      },
      trackRecord: {
        type: 'array',
        items: { type: 'string' },
        description: 'Bullet points about execution track record: previous companies, exits, successful collaborations, failures and learnings',
        minItems: 1,
        maxItems: 3
      },
      sources: {
        type: 'array',
        items: { type: 'string' },
        description: 'All URLs and sources consulted during research. Required for credibility.'
      },
      founders: {
        type: 'array',
        description: 'Detailed profiles of individual founders',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the founder' },
            title: { type: 'string', description: 'Current title/role' },
            education: {
              type: 'array',
              items: { type: 'string' },
              description: 'Educational background (universities, degrees)'
            },
            previousCompanies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Previous companies or significant positions'
            },
            achievements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Notable achievements, awards, or recognition'
            },
            socialLinks: {
              type: 'object',
              properties: {
                linkedin: { type: 'string' },
                x: { type: 'string' },
                github: { type: 'string' }
              },
              description: 'Social media and professional profiles'
            }
          },
          required: ['name', 'title']
        }
      }
    },
    required: ['domain', 'executiveSummary', 'founderRelationship', 'complementarySkills', 'socialPresence', 'trackRecord', 'sources', 'founders']
  }
};

export const SHARED_TOOLS: ToolSchema[] = [
  googleSearchToolSchema,
  webCrawlerToolSchema,
];

export const DOMAIN_RESULT_TOOLS: Record<string, ToolSchema> = {
  founder_profile: founderProfileResultToolSchema,
};

export function getToolsForDomain(domain: string): ToolSchema[] {
  const resultTool = DOMAIN_RESULT_TOOLS[domain];
  if (!resultTool) {
    throw new Error(`Unknown research domain: ${domain}`);
  }
  return [...SHARED_TOOLS, resultTool];
}


