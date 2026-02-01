export const HNSW_CONFIG = {
  EF_SEARCH: 200,
} as const;

export const TIER_META = {
  exact_match: {
    label: 'Exact Match',
    order: 1,
    icon: 'Target',
    color: 'text-accent',
    bgColor: 'bg-accent-tint',
    borderColor: 'border-accent/30',
    description: 'Perfect name match',
  },
  high_confidence: {
    label: 'Highly Relevant',
    order: 2,
    icon: 'Sparkles',
    color: 'text-blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Highly semantically relevant',
  },
  strong_match: {
    label: 'Strong Match',
    order: 3,
    icon: 'CheckCircle2',
    color: 'text-green',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'Strong semantic match',
  },
  relevant: {
    label: 'Relevant',
    order: 4,
    icon: 'Circle',
    color: 'text-text-secondary',
    bgColor: 'bg-bg-tertiary',
    borderColor: 'border-primary',
    description: 'Moderately relevant',
  },
  keyword_match: {
    label: 'Keyword Match',
    order: 5,
    icon: 'Hash',
    color: 'text-text-tertiary',
    bgColor: 'bg-bg-secondary',
    borderColor: 'border-primary',
    description: 'Keyword matches only',
  },
} as const;

export type TierKey = keyof typeof TIER_META;
