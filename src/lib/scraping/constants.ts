export const YC_EXTRACTION_PROMPT = `
Extract company information and ALL discoverable URLs from this Y Combinator page.

Extract:
1. Company: name, official website, YC batch, primary YC partner
2. Founders: name, avatar image URL, and ALL profile URLs (Twitter/X, LinkedIn, GitHub, personal sites, portfolios, blogs)
3. Latest news: title, date, URL, source for each news article or press coverage
4. Launches: title, date, URL for each product launch or announcement
5. Jobs: title, location, application URL for each job posting
6. Social links: Company LinkedIn, Twitter/X, GitHub, blog, docs, Discord, YouTube
7. Image URLs: Company logo, product screenshots, any other images
8. Additional URLs: Any other URLs on the page (demos, videos, app stores, podcasts, community links)

Focus on capturing all URLs with their relevant context. Preserve URLs exactly as they appear.
`.trim();
