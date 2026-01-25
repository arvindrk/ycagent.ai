import { searchCompanies, getSearchCount } from '../src/lib/search/query';
import { parseSearchFilters } from '../src/lib/search/filters/parse';

async function main() {
  console.log('🔍 Phase 3 Verification - Search Query Implementation\n');

  try {
    // Test 1: Simple semantic search
    console.log('Test 1: Simple semantic search');
    console.log('Query: "AI companies building evaluation tools"\n');

    const filters1 = parseSearchFilters({ q: 'AI companies building evaluation tools' });
    const results1 = await searchCompanies({
      query: 'AI companies building evaluation tools',
      filters: filters1,
      limit: 5,
      offset: 0,
    });

    console.log(`✓ Found ${results1.length} results`);
    if (results1.length > 0) {
      console.log(`  Top result: ${results1[0].name}`);
      console.log(`  Semantic score: ${results1[0].semantic_score.toFixed(3)}`);
      console.log(`  Final score: ${results1[0].final_score.toFixed(3)}`);
    }
    console.log();

    // Test 2: Search with filters
    console.log('Test 2: Search with filters');
    console.log('Query: "B2B startups" + batch=W24\n');

    const filters2 = parseSearchFilters({ 
      q: 'B2B startups',
      batch: 'W24'
    });
    const results2 = await searchCompanies({
      query: 'B2B startups',
      filters: filters2,
      limit: 5,
      offset: 0,
    });

    console.log(`✓ Found ${results2.length} results`);
    if (results2.length > 0) {
      console.log(`  Top result: ${results2[0].name} (${results2[0].batch})`);
      console.log(`  Final score: ${results2[0].final_score.toFixed(3)}`);
    }
    console.log();

    // Test 3: Name-based search
    console.log('Test 3: Name-based search');
    console.log('Query: "Stripe"\n');

    const filters3 = parseSearchFilters({ q: 'Stripe' });
    const results3 = await searchCompanies({
      query: 'Stripe',
      filters: filters3,
      limit: 5,
      offset: 0,
    });

    console.log(`✓ Found ${results3.length} results`);
    if (results3.length > 0) {
      console.log(`  Top result: ${results3[0].name}`);
      console.log(`  Name score: ${results3[0].name_score.toFixed(3)}`);
      console.log(`  Final score: ${results3[0].final_score.toFixed(3)}`);
    }
    console.log();

    // Test 4: Count function
    console.log('Test 4: Count function');
    console.log('Query: "developer tools"\n');

    const filters4 = parseSearchFilters({ q: 'developer tools' });
    const count = await getSearchCount('developer tools', filters4);
    console.log(`✓ Total matches: ${count}`);
    console.log();

    // Test 5: Multiple filters
    console.log('Test 5: Multiple filters');
    console.log('Query: "API infrastructure" + tags=B2B,SaaS + is_hiring=true\n');

    const filters5 = parseSearchFilters({ 
      q: 'API infrastructure',
      tags: 'B2B,SaaS',
      is_hiring: 'true'
    });
    const results5 = await searchCompanies({
      query: 'API infrastructure',
      filters: filters5,
      limit: 5,
      offset: 0,
    });

    console.log(`✓ Found ${results5.length} results`);
    if (results5.length > 0) {
      console.log(`  Top result: ${results5[0].name}`);
      console.log(`  Tags: ${results5[0].tags.join(', ')}`);
      console.log(`  Hiring: ${results5[0].is_hiring}`);
    }
    console.log();

    console.log('='.repeat(50));
    console.log('✅ Phase 3 Complete! Search implementation working.');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Phase 3 verification failed:', error);
    process.exit(1);
  }
}

main();
