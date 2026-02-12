import { getCrawlerProvider, CrawlerError, RateLimitError, AuthenticationError } from '../src/lib/crawler/index';

async function testCrawler() {
  console.log('🚀 Testing Crawler Interface\n');

  try {
    const crawler = getCrawlerProvider();
    console.log('✅ Crawler initialized\n');

    // Test 1: Basic scrape with markdown
    console.log('📄 Test 1: Scraping with markdown (default)');
    const scrapeResult = await crawler.scrape('https://firecrawl.dev');
    console.log('✅ Scrape successful');
    console.log('Provider:', scrapeResult.provider);
    console.log('URL:', scrapeResult.url);
    console.log('Markdown length:', scrapeResult.markdown?.length || 0);
    console.log('Preview:', scrapeResult.markdown?.substring(0, 100) + '...\n');

    // Test 2: Scrape with multiple formats
    console.log('📄 Test 2: Scraping with multiple formats');
    const richScrape = await crawler.scrape('https://firecrawl.dev', {
      formats: ['markdown', 'html', 'links'],
      onlyMainContent: false,
    });
    console.log('✅ Rich scrape successful');
    console.log('Has markdown:', !!richScrape.markdown);
    console.log('Has html:', !!richScrape.html);
    console.log('Links found:', richScrape.links?.length || 0);
    console.log('Sample links:', richScrape.links?.slice(0, 3).join(', ') || 'none\n');

    // Test 3: Map operation
    console.log('🗺️  Test 3: Mapping website URLs');
    const mapResult = await crawler.map('https://firecrawl.dev', {
      limit: 10,
      sitemap: 'include',
    });
    console.log('✅ Map successful');
    console.log('Provider:', mapResult.provider);
    console.log('Base URL:', mapResult.url);
    console.log('Total URLs found:', mapResult.totalFound);
    console.log('URLs:', mapResult.urls.slice(0, 5).join('\n  - ') + '\n');

    // Test 4: Map with search filter
    console.log('🔍 Test 4: Map with search filter');
    const filteredMap = await crawler.map('https://docs.firecrawl.dev', {
      limit: 5,
      search: 'api',
      sitemap: 'include',
    });
    console.log('✅ Filtered map successful');
    console.log('URLs matching "api":', filteredMap.totalFound);
    console.log('Filtered URLs:', filteredMap.urls.join('\n  - ') + '\n');

    console.log('✅ All tests passed!');
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('❌ Authentication failed - check FIRECRAWL_API_KEY env var');
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate limit exceeded:', error.message);
      if (error.retryAfter) {
        console.error(`   Retry after ${error.retryAfter} seconds`);
      }
    } else if (error instanceof CrawlerError) {
      console.error('❌ Crawler error:', error.message);
      console.error('   Provider:', error.provider);
      console.error('   Code:', error.code);
    } else {
      console.error('❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

testCrawler();
