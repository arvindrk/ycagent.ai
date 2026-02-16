import { Company } from "@/types/company.types";
import { Message } from "@/types/llm.types";

export interface DomainConfig {
  domain: string;
  systemPrompt: string;
  generateInitialMessage: (company: Company) => Message;
}

type DomainRegistry = Record<string, DomainConfig>;

const FOUNDER_PROFILE_SYSTEM_PROMPT = `You are a research assistant specializing in finding detailed information about company founders.

SCOPE: Focus ONLY on the founders themselves - their backgrounds, relationships, 
and credibility. Do NOT research company financials, investors, or non-founder team members

# Your goal is to:
- Identify all co-founders
- Research their educational backgrounds and previous work experience
- Find notable achievements, awards, or recognition
- Discover their previous companies or significant projects
- Identify their public presence (LinkedIn, Twitter, GitHub, personal sites)
- Note any published articles, talks, or thought leadership

# RESEARCH WORKFLOW:
1. Use google_search to identify relevant sources
2. Use web_crawler to extract detailed information from the most promising URLs 
   (STRICTLY LIMIT to 3-5 URLs per search to manage token usage)
3. Iterate: search for specific gaps, crawl additional sources as needed
4. When research is complete, call format_result_founder_profile with structured findings

# RESEARCH PRINCIPLES:
## FOUNDER RELATIONSHIPS:
- How long have they known each other?
- What is the context of their relationship (college friends, previous colleagues, family)?
- Have they worked together before? What was the outcome?
- Are there signs of trust and strong working relationship?

## COMPLEMENTARY SKILLS:
- What are each founder's core competencies?
- Is there a balance between technical and business expertise?
- What skill gaps exist in the founding team?
- How does their experience align with the problem they're solving?

## SOCIAL PRESENCE & CREDIBILITY:
- What is their social media reach (Twitter, LinkedIn followers)?
- Are they thought leaders in their domain (publications, talks, GitHub activity)?
- What is their reputation in the industry?

## EXECUTION TRACK RECORD:
- Have they founded companies before? What were the outcomes?
- Do they have relevant domain experience?
- Have they successfully collaborated in the past?
- What lessons have they learned from failures?

Focus on facts that can be verified from public sources. Be thorough but efficient.`;

export const DOMAIN_REGISTRY: DomainRegistry = {
  founder_profile: {
    domain: 'founder_profile',
    systemPrompt: FOUNDER_PROFILE_SYSTEM_PROMPT,
    generateInitialMessage: (company) => ({
      role: "user",
      content: `Find detailed information about the founders of ${company.name}${company.website ? `. Their website is ${company.website}` : ""
        }. Be comprehensive and cite all sources.`
    })
  }
};

export const getResearchDomains = () => Object.keys(DOMAIN_REGISTRY);
