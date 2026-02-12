export const googleSearchTool = {
  name: "google_search",
  description: "Search Google for information. Returns relevant search results with titles, links, and snippets.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      },
      num_results: {
        type: "number",
        description: "Number of results (default: 10)"
      }
    },
    required: ["query"]
  }
} as const;
