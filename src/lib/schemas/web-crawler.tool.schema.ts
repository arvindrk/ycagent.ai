export const webCrawlerTool = {
  name: "web_crawler",
  description: "Scrape content from URLs. Best used after google_search to extract full page content. Returns markdown content from each URL. Default limit is 3 URLs to manage token usage.",
  input_schema: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Array of URLs to scrape"
      },
      limit: {
        type: "number",
        description: "Max URLs to scrape (default: 3, max: 10)"
      },
      formats: {
        type: "array",
        items: { 
          type: "string",
          enum: ["markdown", "html", "rawHtml", "links"]
        },
        description: "Content formats to return (default: ['markdown'])"
      },
      onlyMainContent: {
        type: "boolean",
        description: "Extract only main content, skip headers/footers (default: true)"
      }
    },
    required: ["urls"]
  }
} as const;
