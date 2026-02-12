import { getSearchProvider } from '../src/lib/google-search';

async function testSearch() {
  try {
    console.log('🔍 Testing Serper Search Provider...\n');

    const searchProvider = getSearchProvider({ provider: 'serper' });

    const testQuery = 'Y Combinator startups';
    console.log(`Query: "${testQuery}"`);
    console.log('Fetching results...\n');

    const results = await searchProvider.search(testQuery, { numResults: 5 });

    console.log(`Provider: ${results.provider}`);
    console.log(`Query: ${results.query}`);
    console.log(`Results found: ${results.results.length}\n`);

    results.results.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Link: ${item.link}`);
      console.log(`   Snippet: ${item.snippet}`);
      console.log('');
    });

    console.log('✅ Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSearch();
