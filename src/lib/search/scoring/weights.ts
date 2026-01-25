export const SEARCH_SCORING = {
  SEMANTIC_WEIGHT: 0.8,
  NAME_WEIGHT: 0.15,
  FULLTEXT_WEIGHT: 0.05,

  MIN_SEMANTIC_SCORE: 0.1,
  MIN_NAME_SCORE: 0.3,
  MIN_TOTAL_SCORE: 0.05,
} as const;

export const HNSW_CONFIG = {
  EF_SEARCH: 200,
} as const;

export function calculateFinalScore(
  semanticScore: number,
  nameScore: number,
  textScore: number
): number {
  return (
    semanticScore * SEARCH_SCORING.SEMANTIC_WEIGHT +
    nameScore * SEARCH_SCORING.NAME_WEIGHT +
    textScore * SEARCH_SCORING.FULLTEXT_WEIGHT
  );
}

export function meetsMinimumQuality(
  semanticScore: number,
  nameScore: number,
  textScore: number
): boolean {
  const finalScore = calculateFinalScore(semanticScore, nameScore, textScore);

  return (
    finalScore >= SEARCH_SCORING.MIN_TOTAL_SCORE &&
    (semanticScore >= SEARCH_SCORING.MIN_SEMANTIC_SCORE ||
      nameScore >= SEARCH_SCORING.MIN_NAME_SCORE ||
      textScore > 0)
  );
}
