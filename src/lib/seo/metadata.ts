import type { Metadata } from 'next';
import type { Company } from '@/types/company.types';

const BASE_URL = 'https://ycagent.ai';

export function generateCompanyMetadata(company: Company, path: string): Metadata {
  const title = `${company.name} | Deep Research & Intelligence`;
  const description = company.one_liner
    ? `${company.name} - ${company.one_liner}. AI-powered deep research on products, team, funding, and hiring.`
    : `AI-powered research on ${company.name}. Intelligence on products, founders, funding, and hiring opportunities.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}${path}`,
    },
  };
}

export function generateHomeMetadata(): Metadata {
  return {
    title: 'YC Agent | Deep Research Agents for YC Companies',
    description:
      'Deep research agents that crawl, analyze, and synthesize intelligence on Y Combinator companies. Get deep insights on products, teams, funding, and hiring signals.',
    alternates: {
      canonical: BASE_URL,
    },
  };
}
