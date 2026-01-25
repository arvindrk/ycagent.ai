import { searchCompanies, getSearchCount } from '../src/lib/search/query';
import { parseSearchFilters } from '../src/lib/search/filters/parse';
import { generateEmbedding } from '../src/lib/search/embeddings/generate';

async function main() {
  console.log('🔍 Phase 3 Verification - Search Query Implementation\n');

  try {
    // Test 1: Simple semantic search
    console.log('Test 1: Simple semantic search');
    console.log('Query: "AI companies building evaluation tools"\n');

    const query1 = 'AI companies building evaluation tools';
    const filters1 = parseSearchFilters({ q: query1 });
    const embedding1 = await generateEmbedding(query1);
    const results1 = await searchCompanies({
      query: query1,
      filters: filters1,
      limit: 5,
      offset: 0,
    }, embedding1);

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

    const query2 = 'B2B startups';
    const filters2 = parseSearchFilters({
      q: query2,
      batch: 'W24'
    });
    const embedding2 = await generateEmbedding(query2);
    const results2 = await searchCompanies({
      query: query2,
      filters: filters2,
      limit: 5,
      offset: 0,
    }, embedding2);

    console.log(`✓ Found ${results2.length} results`);
    if (results2.length > 0) {
      console.log(`  Top result: ${results2[0].name} (${results2[0].batch})`);
      console.log(`  Final score: ${results2[0].final_score.toFixed(3)}`);
    }
    console.log();

    // Test 3: Name-based search
    console.log('Test 3: Name-based search');
    console.log('Query: "Stripe"\n');

    const query3 = 'Stripe';
    const filters3 = parseSearchFilters({ q: query3 });
    const embedding3 = await generateEmbedding(query3);
    const results3 = await searchCompanies({
      query: query3,
      filters: filters3,
      limit: 5,
      offset: 0,
    }, embedding3);

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

    const query4 = 'developer tools';
    const filters4 = parseSearchFilters({ q: query4 });
    const embedding4 = await generateEmbedding(query4);
    const count = await getSearchCount(filters4, embedding4);
    console.log(`✓ Total matches: ${count}`);
    console.log();

    // Test 5: Multiple filters
    console.log('Test 5: Multiple filters');
    console.log('Query: "API infrastructure" + tags=B2B,SaaS + is_hiring=true\n');

    const query5 = 'API infrastructure';
    const filters5 = parseSearchFilters({
      q: query5,
      tags: 'B2B,SaaS',
      is_hiring: 'true'
    });
    const embedding5 = await generateEmbedding(query5);
    const results5 = await searchCompanies({
      query: query5,
      filters: filters5,
      limit: 5,
      offset: 0,
    }, embedding5);

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
