/**
 * Samples the live score distribution behind the search ranking constants.
 * Run this before changing anything in scoring/, so thresholds are derived
 * from the corpus rather than guessed.
 *
 *   npm run dev
 *   npm run measure:score-distribution
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const QUERIES = [
  'ai agents',
  'healthcare',
  'stripe',
  'developer tools',
  'climate tech',
  'fintech',
  'payments infrastructure',
  'robotics',
  'legal tech',
  'biotech drug discovery',
];

interface Row {
  semantic_score: number;
  tier: string;
}

async function main(): Promise<void> {
  console.log(`\nscore distribution against ${BASE_URL}\n`);
  const maxima: number[] = [];

  for (const query of QUERIES) {
    const res = await fetch(
      `${BASE_URL}/api/companies/search?q=${encodeURIComponent(query)}&limit=50`,
    );
    const body = (await res.json()) as { data?: Row[]; error?: string; search_path?: string };

    if (!body.data) {
      console.log(`${query.padEnd(26)} error: ${body.error}`);
      continue;
    }

    const scores = body.data.map(d => Number(d.semantic_score)).filter(n => n > 0);
    if (scores.length === 0) {
      console.log(`${query.padEnd(26)} no semantic scores (path=${body.search_path})`);
      continue;
    }

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    maxima.push(max);
    const tiers = body.data.reduce<Record<string, number>>((acc, d) => {
      acc[d.tier] = (acc[d.tier] ?? 0) + 1;
      return acc;
    }, {});

    console.log(
      `${query.padEnd(26)} n=${String(scores.length).padEnd(3)} ` +
        `max=${max.toFixed(3)} min=${min.toFixed(3)}  ${JSON.stringify(tiers)}`,
    );
  }

  if (maxima.length > 0) {
    console.log(
      `\n  best score observed across all queries: ${Math.max(...maxima).toFixed(3)}` +
        `\n  any tier threshold above this is unreachable.\n`,
    );
  }
}

void main();
