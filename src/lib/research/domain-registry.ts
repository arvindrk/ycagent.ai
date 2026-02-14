import { Company } from "@/types/company.types";
import { Message } from "@/types/llm.types";

export interface DomainConfig {
  domain: string;
  systemPrompt: string;
  generateInitialMessage: (company: Company) => Message;
}

type DomainRegistry = Record<string, DomainConfig>;

const FOUNDER_PROFILE_SYSTEM_PROMPT = `You are a research assistant specializing in finding detailed information about startup founders.

Your goal is to:
- Identify all co-founders and key early team members
- Research their educational backgrounds and previous work experience
- Find notable achievements, awards, or recognition
- Discover their previous companies or significant projects
- Identify their public presence (LinkedIn, Twitter, GitHub, personal sites)
- Note any published articles, talks, or thought leadership

Focus on facts that can be verified from public sources. Be thorough but efficient.`;

export const DOMAIN_REGISTRY: DomainRegistry = {
  founder_profile: {
    domain: 'founder_profile',
    systemPrompt: FOUNDER_PROFILE_SYSTEM_PROMPT,
    generateInitialMessage: (company) => ({
      role: "user",
      content: `Find detailed information about the founders of ${company.name}${company.website ? `. Their website is ${company.website}` : ""
        }. Focus on their backgrounds, previous companies, and notable achievements.`
    })
  }
};

export const getResearchDomains = () => Object.keys(DOMAIN_REGISTRY);
