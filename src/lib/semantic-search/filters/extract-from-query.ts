import type { ParsedFilters } from './parse';
import {
  BATCH_ALIASES,
  STAGE_ALIASES,
  STATUS_ALIASES,
  REGION_ALIASES,
  LOCATION_ALIASES,
  HIRING_PHRASES,
  NONPROFIT_PHRASES,
  STOPWORDS,
} from './vocabulary-aliases';
import vocabularyData from '../filter-vocabulary.generated.json';

export interface ExtractionResult {
  extractedFilters: ParsedFilters;
  cleanedQuery: string;
}

type VocabEntry = { value: string; normalized: string; count: number };

/** Normalized vocabulary value → canonical stored value, keyed by field. */
const vocabMaps = (() => {
  const toMap = (entries: VocabEntry[]) =>
    new Map(entries.map(e => [e.normalized, e.value]));

  return {
    batches: toMap(vocabularyData.batches),
    stages: toMap(vocabularyData.stages),
    statuses: toMap(vocabularyData.statuses),
    regions: toMap(vocabularyData.regions),
  };
})();

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Build all n-grams up to maxN from a token array. Returns [ngram, startIdx, endIdx]. */
function ngrams(tokens: string[], maxN: number): [string, number, number][] {
  const result: [string, number, number][] = [];
  for (let size = maxN; size >= 1; size--) {
    for (let i = 0; i <= tokens.length - size; i++) {
      result.push([tokens.slice(i, i + size).join(' '), i, i + size - 1]);
    }
  }
  return result;
}

/**
 * Greedy n-gram vocabulary match. Tries longest spans first.
 * Returns matched values and the set of consumed token indices.
 */
function matchVocabulary(
  tokens: string[],
  consumed: Set<number>,
  vocabMap: Map<string, string>,
  aliasMap?: Record<string, string | string[]>,
): { values: string[]; consumed: Set<number> } {
  const matched: string[] = [];
  const newConsumed = new Set(consumed);
  const maxN = Math.min(8, tokens.length);
  const candidates = ngrams(tokens, maxN);

  for (const [gram, start, end] of candidates) {
    let anyConsumed = false;
    for (let i = start; i <= end; i++) {
      if (newConsumed.has(i)) { anyConsumed = true; break; }
    }
    if (anyConsumed) continue;

    const directMatch = vocabMap.get(gram);
    if (directMatch) {
      matched.push(directMatch);
      for (let i = start; i <= end; i++) newConsumed.add(i);
      continue;
    }

    if (aliasMap) {
      const aliasEntry = aliasMap[gram];
      if (aliasEntry) {
        const aliasMatches = Array.isArray(aliasEntry) ? aliasEntry : [aliasEntry];
        matched.push(...aliasMatches);
        for (let i = start; i <= end; i++) newConsumed.add(i);
      }
    }
  }

  return { values: [...new Set(matched)], consumed: newConsumed };
}

function findPhrase(normalizedQuery: string, phrases: Set<string>): string | null {
  for (const phrase of phrases) {
    if (normalizedQuery.includes(phrase)) return phrase;
  }
  return null;
}

const FOUNDED_YEAR_PATTERNS: [RegExp, (m: RegExpMatchArray) => Partial<ParsedFilters>][] = [
  // "founded in 2020" / "started in 2020" / "created in 2020"
  [
    /\b(?:founded|started|created|launched|established)\s+in\s+(20\d{2}|199\d)\b/gi,
    m => ({ founded_year_min: +m[1], founded_year_max: +m[1] }),
  ],
  // "before 2020" / "pre-2020" / "pre 2020"
  [
    /\bbefore\s+(20\d{2}|199\d)\b|\bpre[- ]?\s*(20\d{2}|199\d)\b/gi,
    m => ({ founded_year_max: +(m[1] ?? m[2]) - 1 }),
  ],
  // "after 2018" / "post-2018" / "since 2018"
  [
    /\b(?:after|since)\s+(20\d{2}|199\d)\b|\bpost[- ]?\s*(20\d{2}|199\d)\b/gi,
    m => ({ founded_year_min: +(m[1] ?? m[2]) + 1 }),
  ],
  // bare year like "2020 companies" or "companies from 2021"
  [
    /\b(20\d{2}|199\d)\b/g,
    m => ({ founded_year_min: +m[1], founded_year_max: +m[1] }),
  ],
];

const TEAM_SIZE_PATTERNS: [RegExp, (m: RegExpMatchArray) => Partial<ParsedFilters>][] = [
  // "10 to 50 employees" / "10-50 people"
  [
    /\b(\d+)\s*(?:to|[-–])\s*(\d+)\s*(?:employees?|people|person|staff|members?)?\b/gi,
    m => ({ team_size_min: +m[1], team_size_max: +m[2] }),
  ],
  // "< 10 employees" / "under 10" / "fewer than 10" / "less than 10"
  [
    /\b(?:under|fewer\s+than|less\s+than)\s+(\d+)\s*(?:employees?|people|person|staff|members?)?\b|<\s*(\d+)\s*(?:employees?|people|person|staff|members?)?\b/gi,
    m => ({ team_size_max: +(m[1] ?? m[2]) }),
  ],
  // "> 50 employees" / "50+ people" / "more than 50" / "over 50"
  [
    /\b(?:over|more\s+than|greater\s+than)\s+(\d+)\s*(?:employees?|people|person|staff|members?)?\b|\b(\d+)\+\s*(?:employees?|people|person|staff|members?)?\b|>\s*(\d+)\s*(?:employees?|people|person|staff|members?)?\b/gi,
    m => ({ team_size_min: +(m[1] ?? m[2] ?? m[3]) }),
  ],
  // "50 employees" (exact number with label)
  [
    /\b(\d+)\s+(?:employees?|people|person|staff|members?)\b/gi,
    m => ({ team_size_min: +m[1], team_size_max: +m[1] }),
  ],
];

const TEAM_SIZE_PHRASES: [RegExp, Partial<ParsedFilters>][] = [
  [/\bsolo\s+founder\b|\b1\s+person\s+team\b/gi, { team_size_max: 2 }],
  [/\bsmall\s+(?:team|startup|company|firm)\b/gi, { team_size_max: 20 }],
  [/\bmid[- ]?size\b|\bmedium\s+(?:size|sized|company|startup)\b/gi, { team_size_min: 50, team_size_max: 500 }],
  [/\blarge\s+(?:company|companies|startup|firm)\b|\bbig\s+company\b/gi, { team_size_min: 200 }],
  [/\benterprise[- ]?size\b/gi, { team_size_min: 500 }],
];

export function extractFiltersFromQuery(rawQuery: string): ExtractionResult {
  const normalizedQuery = norm(rawQuery);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const consumed = new Set<number>();
  const filters: ParsedFilters = {};

  // --- 1. Batch: short-form aliases (W24, S23, F24, SP25) ---
  {
    const batchRegex = /\b([wsf](?:p)?(?:20\d{2}|\d{2}))\b/gi;
    let match: RegExpExecArray | null;
    while ((match = batchRegex.exec(normalizedQuery)) !== null) {
      const alias = BATCH_ALIASES[match[1].toLowerCase()];
      if (alias && !filters.batch) {
        filters.batch = alias;
        const aliasTokens = match[1].toLowerCase().split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === aliasTokens[0]) consumed.add(i);
        }
      }
    }
  }

  // --- 2. Batch: full-form name match (e.g. "Winter 2024") ---
  if (!filters.batch) {
    const fullBatchRegex = /\b(winter|summer|fall|spring)\s+(20\d{2}|19\d{2})\b/gi;
    let match: RegExpExecArray | null;
    while ((match = fullBatchRegex.exec(normalizedQuery)) !== null) {
      const candidate = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)} ${match[2]}`;
      if (vocabMaps.batches.has(norm(candidate))) {
        filters.batch = candidate;
        const spanTokens = norm(match[0]).split(/\s+/);
        outer: for (let i = 0; i <= tokens.length - spanTokens.length; i++) {
          for (let j = 0; j < spanTokens.length; j++) {
            if (tokens[i + j] !== spanTokens[j]) continue outer;
          }
          for (let j = 0; j < spanTokens.length; j++) consumed.add(i + j);
          break;
        }
      }
    }
  }

  // --- 3. Stage: keyword + alias match ---
  {
    const stageResult = matchVocabulary(tokens, consumed, vocabMaps.stages, STAGE_ALIASES);
    if (stageResult.values.length > 0) {
      filters.stage = stageResult.values[0];
      stageResult.consumed.forEach(i => consumed.add(i));
    }
  }

  // --- 4. Status: keyword + alias match ---
  {
    // Multi-word status phrases first (e.g. "went public", "shut down")
    for (const [phrase, status] of Object.entries(STATUS_ALIASES)) {
      if (phrase.includes(' ') && normalizedQuery.includes(phrase)) {
        filters.status = status;
        const phraseTokens = phrase.split(' ');
        outer: for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
          for (let j = 0; j < phraseTokens.length; j++) {
            if (tokens[i + j] !== phraseTokens[j]) continue outer;
          }
          for (let j = 0; j < phraseTokens.length; j++) consumed.add(i + j);
          break;
        }
        break;
      }
    }
    if (!filters.status) {
      const statusResult = matchVocabulary(tokens, consumed, vocabMaps.statuses);
      // Avoid "active" matching as status unless there's no other context
      if (statusResult.values.length > 0 && statusResult.values[0] !== 'Active') {
        filters.status = statusResult.values[0];
        statusResult.consumed.forEach(i => consumed.add(i));
      }
    }
  }

  // --- 5. Team size: regex patterns ---
  {
    // Try ranked patterns in order; stop at first match to avoid double-setting
    let teamSizeMatched = false;
    let workingQuery = normalizedQuery;

    for (const [pattern, extractor] of TEAM_SIZE_PATTERNS) {
      if (teamSizeMatched) break;
      pattern.lastIndex = 0;
      const match = pattern.exec(workingQuery);
      if (match) {
        const extracted = extractor(match);
        for (const [k, v] of Object.entries(extracted)) {
          if ((filters as Record<string, unknown>)[k] === undefined) {
            (filters as Record<string, unknown>)[k] = v;
          }
        }
        const matchedTokens = norm(match[0]).split(/\s+/);
        outer: for (let i = 0; i <= tokens.length - matchedTokens.length; i++) {
          for (let j = 0; j < matchedTokens.length; j++) {
            if (tokens[i + j] !== matchedTokens[j]) continue outer;
          }
          for (let j = 0; j < matchedTokens.length; j++) consumed.add(i + j);
          break;
        }
        workingQuery = workingQuery.replace(match[0], ' ');
        teamSizeMatched = true;
      }
    }

    if (!teamSizeMatched) {
      for (const [pattern, extracted] of TEAM_SIZE_PHRASES) {
        pattern.lastIndex = 0;
        const match = pattern.exec(normalizedQuery);
        if (match) {
          for (const [k, v] of Object.entries(extracted)) {
            if ((filters as Record<string, unknown>)[k] === undefined) {
              (filters as Record<string, unknown>)[k] = v;
            }
          }
          const matchedTokens = norm(match[0]).split(/\s+/);
          outer: for (let i = 0; i <= tokens.length - matchedTokens.length; i++) {
            for (let j = 0; j < matchedTokens.length; j++) {
              if (tokens[i + j] !== matchedTokens[j]) continue outer;
            }
            for (let j = 0; j < matchedTokens.length; j++) consumed.add(i + j);
            break;
          }
          break;
        }
      }
    }
  }

  // --- 6. is_hiring ---
  {
    const found = findPhrase(normalizedQuery, HIRING_PHRASES);
    if (found) {
      filters.is_hiring = true;
      const phraseTokens = found.split(' ');
      outer: for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
        for (let j = 0; j < phraseTokens.length; j++) {
          if (tokens[i + j] !== phraseTokens[j]) continue outer;
        }
        for (let j = 0; j < phraseTokens.length; j++) consumed.add(i + j);
        break;
      }
    }
    if (normalizedQuery.includes('not hiring')) {
      filters.is_hiring = false;
    }
  }

  // --- 7. is_nonprofit ---
  {
    const found = findPhrase(normalizedQuery, NONPROFIT_PHRASES);
    if (found) {
      filters.is_nonprofit = true;
      const phraseTokens = found.split(' ');
      outer: for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
        for (let j = 0; j < phraseTokens.length; j++) {
          if (tokens[i + j] !== phraseTokens[j]) continue outer;
        }
        for (let j = 0; j < phraseTokens.length; j++) consumed.add(i + j);
        break;
      }
    }
  }

  // --- 8. Location (city alias match before region to avoid conflicts) ---
  {
    const sortedLocationAliases = Object.entries(LOCATION_ALIASES)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [alias, city] of sortedLocationAliases) {
      // Only match if preceded by "in ", "based in ", or at start of query
      const pattern = new RegExp(`(?:^|\\bin\\s+|\\bbased\\s+in\\s+)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(normalizedQuery) && !filters.location) {
        filters.location = city;
        const aliasTokens = alias.split(' ');
        outer: for (let i = 0; i <= tokens.length - aliasTokens.length; i++) {
          for (let j = 0; j < aliasTokens.length; j++) {
            if (tokens[i + j] !== aliasTokens[j]) continue outer;
          }
          for (let j = 0; j < aliasTokens.length; j++) consumed.add(i + j);
          // Also consume the preceding "in" token if present
          if (i > 0 && tokens[i - 1] === 'in') consumed.add(i - 1);
          if (i > 1 && tokens[i - 2] === 'based' && tokens[i - 1] === 'in') consumed.add(i - 2);
          break;
        }
        if (filters.location) break;
      }
    }
  }

  // --- 9. Regions: vocabulary n-gram match ---
  {
    const regionResult = matchVocabulary(tokens, consumed, vocabMaps.regions, REGION_ALIASES);
    if (regionResult.values.length > 0) {
      filters.regions = regionResult.values;
      regionResult.consumed.forEach(i => consumed.add(i));
    }
  }

  // --- 10. Founded year ---
  {
    const yearConsumedTokens = new Set<number>();

    for (const [pattern, extractor] of FOUNDED_YEAR_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(normalizedQuery);
      if (match) {
        const extracted = extractor(match);
        // Don't override earlier (more specific) year extractions
        if (extracted.founded_year_min !== undefined && filters.founded_year_min === undefined) {
          filters.founded_year_min = extracted.founded_year_min;
        }
        if (extracted.founded_year_max !== undefined && filters.founded_year_max === undefined) {
          filters.founded_year_max = extracted.founded_year_max;
        }
        const matchedTokens = norm(match[0]).split(/\s+/);
        outer: for (let i = 0; i <= tokens.length - matchedTokens.length; i++) {
          for (let j = 0; j < matchedTokens.length; j++) {
            if (tokens[i + j] !== matchedTokens[j]) continue outer;
          }
          for (let j = 0; j < matchedTokens.length; j++) {
            consumed.add(i + j);
            yearConsumedTokens.add(i + j);
          }
          break;
        }
        break; // Only apply the first matching year pattern
      }
    }
  }

  // --- Build cleaned query ---
  const remainingTokens = tokens
    .filter((t, i) => !consumed.has(i) && !STOPWORDS.has(t))
    .filter(t => t.length > 1);

  const cleanedQuery = remainingTokens.join(' ').trim();

  return { extractedFilters: filters, cleanedQuery };
}
