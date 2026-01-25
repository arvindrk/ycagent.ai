import { searchCompanies, getSearchCount, type SearchResult } from '../src/lib/search/query';
import { parseSearchFilters } from '../src/lib/search/filters/parse';
import { generateEmbedding } from '../src/lib/search/embeddings/generate';

interface TestCase {
  category: string;
  name: string;
  query: string;
  filters?: Record<string, any>;
  expectedTop?: string;
  expectedTags?: string[];
  expectedIndustries?: string[];
  expectedRegionsContain?: string[];
  minSemanticScore?: number;
  minNameScore?: number;
  minTextScore?: number;
  minFinalScore?: number;
  minResults?: number;
  maxResults?: number;
  minCount?: number;
  minRelevantInTop5?: number;
  diverseResults?: boolean;
  checkNotInTop5?: string[];
  validate?: (results: SearchResult[], count: number) => ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  timingMs: number;
}

const testCases: TestCase[] = [
  // ============================================
  // Category 1: Exact Name Match Tests
  // ============================================
  {
    category: 'Exact Name Match',
    name: 'Find Stripe by exact name',
    query: 'Stripe',
    expectedTop: 'Stripe',
    minNameScore: 0.9,
  },
  {
    category: 'Exact Name Match',
    name: 'Find Airbnb by exact name',
    query: 'Airbnb',
    expectedTop: 'Airbnb',
    minNameScore: 0.9,
  },
  {
    category: 'Exact Name Match',
    name: 'Find Dropbox by exact name',
    query: 'Dropbox',
    expectedTop: 'Dropbox',
    minNameScore: 0.9,
  },
  {
    category: 'Exact Name Match',
    name: 'Find Coinbase by exact name',
    query: 'Coinbase',
    expectedTop: 'Coinbase',
    minNameScore: 0.9,
  },
  {
    category: 'Exact Name Match',
    name: 'Find Zapier by exact name',
    query: 'Zapier',
    expectedTop: 'Zapier',
    minNameScore: 0.9,
  },

  // ============================================
  // Category 2: Semantic Concept Search
  // ============================================
  {
    category: 'Semantic Concept',
    name: 'Large language model companies',
    query: 'companies building large language models',
    expectedTags: ['AI', 'Artificial Intelligence', 'Machine Learning'],
    minSemanticScore: 0.35,
    minRelevantInTop5: 4,
    minResults: 5,
  },
  {
    category: 'Semantic Concept',
    name: 'Automated code review tools',
    query: 'automated code review tools',
    expectedTags: ['Developer Tools', 'AI', 'SaaS'],
    minSemanticScore: 0.3,
    minResults: 5,
  },
  {
    category: 'Semantic Concept',
    name: 'Voice-based AI assistants',
    query: 'voice-based AI assistants',
    expectedTags: ['AI', 'Artificial Intelligence'],
    minSemanticScore: 0.3,
    minResults: 5,
  },
  {
    category: 'Semantic Concept',
    name: 'Telemedicine platforms',
    query: 'telemedicine platforms for rural areas',
    expectedIndustries: ['Healthcare'],
    minSemanticScore: 0.25,
    minResults: 3,
  },
  {
    category: 'Semantic Concept',
    name: 'Mental health apps',
    query: 'mental health apps using cognitive behavioral therapy',
    expectedIndustries: ['Healthcare'],
    minSemanticScore: 0.25,
    minResults: 3,
  },
  {
    category: 'Semantic Concept',
    name: 'Cross-border payments',
    query: 'cross-border payment infrastructure',
    expectedTags: ['Fintech'],
    minSemanticScore: 0.3,
    minResults: 5,
  },
  {
    category: 'Semantic Concept',
    name: 'B2B buy now pay later',
    query: 'buy now pay later for B2B companies',
    expectedTags: ['Fintech', 'B2B'],
    minSemanticScore: 0.25,
    minResults: 3,
  },

  // ============================================
  // Category 3: Natural Language Queries
  // ============================================
  {
    category: 'Natural Language',
    name: 'AI for developer productivity',
    query: 'AI companies that help developers write better code',
    expectedTags: ['AI', 'Developer Tools', 'Artificial Intelligence'],
    minResults: 5,
    minRelevantInTop5: 3,
  },
  {
    category: 'Natural Language',
    name: 'Fintech for Africa',
    query: 'fintech startups helping small businesses in Africa',
    expectedTags: ['Fintech'],
    expectedRegionsContain: ['Africa'],
    minResults: 2,
  },
  {
    category: 'Natural Language',
    name: 'SaaS collaboration tools',
    query: 'SaaS tools for engineering teams to collaborate',
    expectedTags: ['SaaS', 'B2B', 'Productivity'],
    minResults: 10,
    minRelevantInTop5: 3,
  },
  {
    category: 'Natural Language',
    name: 'Freelancer marketplaces',
    query: 'marketplace connecting freelancers with companies',
    expectedTags: ['Marketplace'],
    minResults: 5,
    minRelevantInTop5: 3,
  },
  {
    category: 'Natural Language',
    name: 'E-commerce analytics',
    query: 'analytics platforms for e-commerce businesses',
    expectedTags: ['Analytics', 'E-commerce', 'SaaS'],
    minResults: 5,
  },

  // ============================================
  // Category 4: Filter Combination Tests
  // ============================================
  {
    category: 'Filter Combination',
    name: 'AI analytics + hiring + W23',
    query: 'AI-powered analytics platforms',
    filters: { batch: 'Winter 2023', is_hiring: 'true' },
    expectedTags: ['AI', 'Analytics', 'Artificial Intelligence', 'SaaS', 'B2B'],
    minResults: 1,
    minRelevantInTop5: 1,
  },
  {
    category: 'Filter Combination',
    name: 'Developer tools + B2B + team size',
    query: 'developer tools',
    filters: { tags: 'B2B,SaaS', team_size_min: '10', team_size_max: '50' },
    minResults: 5,
  },
  {
    category: 'Filter Combination',
    name: 'Healthcare + Growth + US',
    query: 'healthcare technology',
    filters: { stage: 'Growth', regions: 'United States of America' },
    expectedIndustries: ['Healthcare'],
    minResults: 3,
  },
  {
    category: 'Filter Combination',
    name: 'SaaS + hiring + multiple tags',
    query: 'B2B SaaS companies',
    filters: { is_hiring: 'true', tags: 'B2B,SaaS' },
    minResults: 10,
  },

  // ============================================
  // Category 5: Edge Cases & Boundaries
  // ============================================
  {
    category: 'Edge Cases',
    name: 'Ambiguous: cloud storage',
    query: 'cloud storage',
    minResults: 5,
    diverseResults: true,
  },
  {
    category: 'Edge Cases',
    name: 'Ambiguous: AI agent',
    query: 'AI agent',
    minResults: 20,
    diverseResults: true,
  },
  {
    category: 'Edge Cases',
    name: 'Very specific: CRISPR',
    query: 'CRISPR gene editing for rare diseases',
    maxResults: 10,
    minSemanticScore: 0.25,
  },
  {
    category: 'Edge Cases',
    name: 'Very specific: quantum computing',
    query: 'quantum computing hardware for cryptography',
    maxResults: 10,
    minSemanticScore: 0.25,
  },
  {
    category: 'Edge Cases',
    name: 'Broad: software companies',
    query: 'software companies',
    minResults: 50,
    minCount: 500,
  },
  {
    category: 'Edge Cases',
    name: 'Broad: B2B SaaS',
    query: 'B2B SaaS',
    minResults: 50,
    minCount: 500,
  },
  {
    category: 'Edge Cases',
    name: 'Negative space: blockchain',
    query: 'enterprise blockchain for supply chain',
    checkNotInTop5: ['Stripe', 'Airbnb', 'Dropbox'],
    minResults: 3,
  },

  // ============================================
  // Category 6: Scoring Weight Validation
  // ============================================
  {
    category: 'Scoring Weights',
    name: 'Name score dominance',
    query: 'Reddit',
    validate: (results) => {
      const top = results[0];
      if (!top) return { passed: false, message: 'No results returned' };

      const nameContribution = top.name_score * 0.2;
      const semanticContribution = top.semantic_score * 0.7;

      if (top.name === 'Reddit') {
        return {
          passed: true,
          message: 'Exact name match returns correct company as top result',
          details: `${top.name} - Name: ${nameContribution.toFixed(3)}, Semantic: ${semanticContribution.toFixed(3)}, Final: ${top.final_score.toFixed(3)}`
        };
      }
      return {
        passed: false,
        message: `Expected Reddit as top result. Got: ${top.name}`,
        details: `Name: ${nameContribution.toFixed(3)}, Semantic: ${semanticContribution.toFixed(3)}`
      };
    },
  },
  {
    category: 'Scoring Weights',
    name: 'Semantic score dominance',
    query: 'autonomous vehicle software',
    validate: (results) => {
      const top = results[0];
      if (!top) return { passed: false, message: 'No results returned' };

      const semanticContribution = top.semantic_score * 0.7;
      const nameContribution = top.name_score * 0.2;
      const textContribution = top.text_score * 0.1;

      if (semanticContribution > nameContribution && semanticContribution > textContribution) {
        return {
          passed: true,
          message: 'Semantic score correctly dominates for concept search',
          details: `Semantic: ${semanticContribution.toFixed(3)}, Name: ${nameContribution.toFixed(3)}, Text: ${textContribution.toFixed(3)}`
        };
      }
      return {
        passed: false,
        message: 'Semantic score should dominate for concept queries',
        details: `Semantic: ${semanticContribution.toFixed(3)}, Name: ${nameContribution.toFixed(3)}, Text: ${textContribution.toFixed(3)}`
      };
    },
  },
  {
    category: 'Scoring Weights',
    name: 'Fulltext contribution',
    query: 'developer tools analytics',
    validate: (results) => {
      const withKeywords = results.filter(r =>
        r.tags.some((t: string) => t.includes('Developer Tools')) ||
        r.tags.some((t: string) => t.includes('Analytics'))
      );

      if (withKeywords.length > 0 && withKeywords[0].text_score > 0) {
        return {
          passed: true,
          message: 'Fulltext scoring contributes to keyword matches',
          details: `${withKeywords.length} results with relevant tags, top text_score: ${withKeywords[0].text_score.toFixed(3)}`
        };
      }
      return {
        passed: false,
        message: 'Expected fulltext scoring to boost keyword matches'
      };
    },
  },

  // ============================================
  // Category 7: Pagination & Count Consistency
  // ============================================
  {
    category: 'Pagination',
    name: 'No duplicate results across pages',
    query: 'AI companies',
    validate: async (results, count) => {
      const query = 'AI companies';
      const filters = parseSearchFilters({ q: query });
      const embedding = await generateEmbedding(query);

      const page1 = await searchCompanies({ query, filters, limit: 10, offset: 0 }, embedding);
      const page2 = await searchCompanies({ query, filters, limit: 10, offset: 10 }, embedding);
      const page3 = await searchCompanies({ query, filters, limit: 10, offset: 20 }, embedding);

      const allIds = [...page1, ...page2, ...page3].map(c => c.id);
      const uniqueIds = new Set(allIds);

      if (uniqueIds.size === allIds.length) {
        return {
          passed: true,
          message: 'No duplicates across 3 pages',
          details: `${allIds.length} results, all unique`
        };
      }
      return {
        passed: false,
        message: `Found ${allIds.length - uniqueIds.size} duplicate IDs across pages`
      };
    },
  },
  {
    category: 'Pagination',
    name: 'Count matches actual results',
    query: 'fintech',
    validate: async (results, count) => {
      const query = 'fintech';
      const filters = parseSearchFilters({ q: query });
      const embedding = await generateEmbedding(query);

      // Fetch all results in batches
      let allResults: SearchResult[] = [];
      let offset = 0;
      const limit = 50;

      while (offset < Math.min(count, 200)) { // Cap at 200 for performance
        const batch = await searchCompanies({ query, filters, limit, offset }, embedding);
        if (batch.length === 0) break;
        allResults = [...allResults, ...batch];
        offset += limit;
      }

      const cappedCount = Math.min(count, 200);
      if (allResults.length === cappedCount || (allResults.length < cappedCount && allResults.length % limit !== 0)) {
        return {
          passed: true,
          message: 'Count matches fetched results',
          details: `Count: ${count}, Fetched: ${allResults.length} (capped at 200)`
        };
      }
      return {
        passed: false,
        message: `Count mismatch: reported ${count}, fetched ${allResults.length}`
      };
    },
  },
];

async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const filters = parseSearchFilters({
      q: testCase.query,
      ...testCase.filters
    });

    const embedding = await generateEmbedding(testCase.query);

    const [results, count] = await Promise.all([
      searchCompanies({
        query: testCase.query,
        filters,
        limit: testCase.minResults || 50,
        offset: 0,
      }, embedding),
      getSearchCount(filters, embedding),
    ]);

    const timingMs = Date.now() - startTime;

    // Run custom validation if provided
    if (testCase.validate) {
      const validation = await testCase.validate(results, count);
      if (!validation.passed) {
        errors.push(validation.message);
        if (validation.details) {
          warnings.push(validation.details);
        }
      } else if (validation.details) {
        warnings.push(validation.details);
      }

      return {
        category: testCase.category,
        name: testCase.name,
        passed: validation.passed,
        errors,
        warnings,
        timingMs,
      };
    }

    // Standard validations

    // Check result count
    if (testCase.minResults && results.length < testCase.minResults) {
      errors.push(`Expected ≥${testCase.minResults} results, got ${results.length}`);
    }
    if (testCase.maxResults && results.length > testCase.maxResults) {
      warnings.push(`Expected ≤${testCase.maxResults} results, got ${results.length} (may indicate poor precision)`);
    }
    if (testCase.minCount && count < testCase.minCount) {
      errors.push(`Expected count ≥${testCase.minCount}, got ${count}`);
    }

    if (results.length === 0) {
      errors.push('No results returned');
      return {
        category: testCase.category,
        name: testCase.name,
        passed: false,
        errors,
        warnings,
        timingMs,
      };
    }

    const top = results[0];

    // Check expected top result
    if (testCase.expectedTop && top.name !== testCase.expectedTop) {
      errors.push(`Expected "${testCase.expectedTop}" as top result, got "${top.name}"`);
    }

    // Check score thresholds
    if (testCase.minSemanticScore && top.semantic_score < testCase.minSemanticScore) {
      errors.push(`Semantic score ${top.semantic_score.toFixed(3)} < ${testCase.minSemanticScore}`);
    }
    if (testCase.minNameScore && top.name_score < testCase.minNameScore) {
      errors.push(`Name score ${top.name_score.toFixed(3)} < ${testCase.minNameScore}`);
    }
    if (testCase.minTextScore && top.text_score < testCase.minTextScore) {
      errors.push(`Text score ${top.text_score.toFixed(3)} < ${testCase.minTextScore}`);
    }
    if (testCase.minFinalScore && top.final_score < testCase.minFinalScore) {
      errors.push(`Final score ${top.final_score.toFixed(3)} < ${testCase.minFinalScore}`);
    }

    // Check expected tags in top results
    if (testCase.expectedTags) {
      const top5 = results.slice(0, 5);
      const relevantCount = top5.filter(r =>
        testCase.expectedTags!.some(tag => r.tags.includes(tag))
      ).length;

      const minRelevant = testCase.minRelevantInTop5 || Math.ceil(testCase.expectedTags.length / 2);
      if (relevantCount < minRelevant) {
        errors.push(`Only ${relevantCount}/${top5.length} top results have expected tags [${testCase.expectedTags.join(', ')}]`);
      }
    }

    // Check expected industries
    if (testCase.expectedIndustries) {
      const top5 = results.slice(0, 5);
      const relevantCount = top5.filter(r =>
        testCase.expectedIndustries!.some(ind => r.industries.includes(ind))
      ).length;

      if (relevantCount === 0) {
        errors.push(`No top results match expected industries [${testCase.expectedIndustries.join(', ')}]`);
      }
    }

    // Check expected regions
    if (testCase.expectedRegionsContain) {
      const top5 = results.slice(0, 5);
      const relevantCount = top5.filter(r =>
        testCase.expectedRegionsContain!.some(reg =>
          r.regions.some((rr: string) => rr.includes(reg)) ||
          (r.all_locations && r.all_locations.includes(reg))
        )
      ).length;

      if (relevantCount === 0) {
        warnings.push(`No top results contain expected regions [${testCase.expectedRegionsContain.join(', ')}]`);
      }
    }

    // Check diversity
    if (testCase.diverseResults) {
      const top10 = results.slice(0, 10);
      const uniqueFirstTags = new Set(top10.map(r => r.tags[0]));
      if (uniqueFirstTags.size < 5) {
        warnings.push(`Low diversity: only ${uniqueFirstTags.size} unique primary tags in top 10`);
      }
    }

    // Check negative space
    if (testCase.checkNotInTop5) {
      const top5Names = results.slice(0, 5).map(r => r.name);
      const foundUnexpected = testCase.checkNotInTop5.filter(name => top5Names.includes(name));
      if (foundUnexpected.length > 0) {
        errors.push(`Unexpected companies in top 5: ${foundUnexpected.join(', ')}`);
      }
    }

    // Validate filters were applied
    if (testCase.filters) {
      const filterErrors = results.filter(r => {
        if (testCase.filters!.batch && r.batch !== testCase.filters!.batch) return true;
        if (testCase.filters!.stage && r.stage !== testCase.filters!.stage) return true;
        if (testCase.filters!.is_hiring && r.is_hiring !== (testCase.filters!.is_hiring === 'true')) return true;
        if (testCase.filters!.team_size_min && r.team_size && r.team_size < parseInt(testCase.filters!.team_size_min)) return true;
        if (testCase.filters!.team_size_max && r.team_size && r.team_size > parseInt(testCase.filters!.team_size_max)) return true;
        return false;
      });

      if (filterErrors.length > 0) {
        errors.push(`${filterErrors.length} results don't match filter criteria`);
      }
    }

    return {
      category: testCase.category,
      name: testCase.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timingMs,
    };

  } catch (error) {
    return {
      category: testCase.category,
      name: testCase.name,
      passed: false,
      errors: [`Exception: ${error instanceof Error ? error.message : String(error)}`],
      warnings,
      timingMs: Date.now() - startTime,
    };
  }
}

async function main() {
  console.log('🔍 Phase 3 Exhaustive Verification - Semantic Search Evaluation\n');
  console.log(`Running ${testCases.length} test cases across ${new Set(testCases.map(t => t.category)).size} categories...\n`);

  const results: TestResult[] = [];
  const categories = new Set(testCases.map(t => t.category));

  for (const category of categories) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${category}`);
    console.log('='.repeat(60));

    const categoryTests = testCases.filter(t => t.category === category);

    for (let i = 0; i < categoryTests.length; i++) {
      const testCase = categoryTests[i];
      process.stdout.write(`\n[${i + 1}/${categoryTests.length}] ${testCase.name}... `);

      const result = await runTest(testCase);
      results.push(result);

      if (result.passed) {
        console.log(`✅ (${result.timingMs}ms)`);
      } else {
        console.log(`❌ (${result.timingMs}ms)`);
        result.errors.forEach(err => console.log(`    ❌ ${err}`));
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warn => console.log(`    ⚠️  ${warn}`));
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.timingMs, 0);
  const avgTime = totalTime / results.length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`\nTiming:`);
  console.log(`  Total: ${totalTime}ms`);
  console.log(`  Average: ${avgTime.toFixed(0)}ms per test`);
  console.log(`  Fastest: ${Math.min(...results.map(r => r.timingMs))}ms`);
  console.log(`  Slowest: ${Math.max(...results.map(r => r.timingMs))}ms`);

  // Category breakdown
  console.log('\n\nCategory Breakdown:');
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryFailed = categoryResults.filter(r => !r.passed).length;
    const passRate = ((categoryPassed / categoryResults.length) * 100).toFixed(0);

    const status = categoryFailed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${category.padEnd(25)} ${categoryPassed}/${categoryResults.length} (${passRate}%)`);
  }

  // Failed tests detail
  if (failed > 0) {
    console.log('\n\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n  ❌ ${r.category}: ${r.name}`);
      r.errors.forEach(err => console.log(`     → ${err}`));
    });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('✅ All tests passed! Semantic search is working correctly.');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review failures above.`);
  }

  console.log('='.repeat(60));
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
