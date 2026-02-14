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
  description: "Scrape content from URLs. Best used after google_search to extract full page content. Returns markdown content from each URL. Default limit is 3 URLs to manage token usage.",
  inputSchema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Array of URLs to scrape"
      },
      limit: { type: "number", description: "Max URLs to scrape (default: 3, max: 10)" },
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

export const ALL_TOOLS: ToolSchema[] = [
  googleSearchToolSchema,
  webCrawlerToolSchema
];
