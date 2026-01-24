import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyPhase1() {
  console.log('🔍 Verifying Phase 1: Database Setup\n');

  try {
    // 1. Check if pgvector extension is enabled
    console.log('1. Checking pgvector extension...');
    const extensionResult = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector';
    `);
    if (extensionResult.rows.length > 0) {
      console.log('   ✅ pgvector extension enabled\n');
    } else {
      console.log('   ❌ pgvector extension NOT found\n');
    }

    // 2. Check if embedding column exists
    console.log('2. Checking embedding column...');
    const embeddingColResult = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'embedding';
    `);
    if (embeddingColResult.rows.length > 0) {
      console.log(`   ✅ embedding column exists (type: ${embeddingColResult.rows[0].udt_name})\n`);
    } else {
      console.log('   ❌ embedding column NOT found\n');
    }

    // 3. Check if search_vector column exists
    console.log('3. Checking search_vector column...');
    const searchVectorResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'search_vector';
    `);
    if (searchVectorResult.rows.length > 0) {
      console.log(`   ✅ search_vector column exists (type: ${searchVectorResult.rows[0].data_type})\n`);
    } else {
      console.log('   ❌ search_vector column NOT found\n');
    }

    // 4. Check HNSW index
    console.log('4. Checking HNSW index...');
    const hnswIndexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'companies' AND indexname = 'idx_companies_embedding_hnsw';
    `);
    if (hnswIndexResult.rows.length > 0) {
      console.log('   ✅ HNSW index created\n');
      console.log('   Index definition:');
      console.log(`   ${hnswIndexResult.rows[0].indexdef}\n`);
    } else {
      console.log('   ❌ HNSW index NOT found\n');
    }

    // 5. Check full-text search index
    console.log('5. Checking full-text search index...');
    const ftsIndexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'companies' AND indexname = 'idx_companies_search_vector';
    `);
    if (ftsIndexResult.rows.length > 0) {
      console.log('   ✅ Full-text search index created\n');
    } else {
      console.log('   ❌ Full-text search index NOT found\n');
    }

    // 6. Check batch index
    console.log('6. Checking batch filter index...');
    const batchIndexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'companies' AND indexname = 'idx_companies_batch';
    `);
    if (batchIndexResult.rows.length > 0) {
      console.log('   ✅ Batch filter index created\n');
    } else {
      console.log('   ❌ Batch filter index NOT found\n');
    }

    // 7. List all indexes on companies table
    console.log('7. All indexes on companies table:');
    const allIndexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'companies'
      ORDER BY indexname;
    `);
    allIndexesResult.rows.forEach((row) => {
      console.log(`   - ${row.indexname}`);
    });
    console.log('');

    // 8. Test JSONB filter queries
    console.log('8. Testing JSONB filter queries...');

    // Test tags filter
    const tagsTest = await pool.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE tags ?| ARRAY['AI', 'ML'];
    `);
    console.log(`   ✅ Tags filter query works (found ${tagsTest.rows[0].count} companies with AI or ML tags)\n`);

    // Test industries filter
    const industriesTest = await pool.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE industries ?| ARRAY['B2B', 'SaaS'];
    `);
    console.log(`   ✅ Industries filter query works (found ${industriesTest.rows[0].count} companies in B2B or SaaS)\n`);

    // Test batch filter
    const batchTest = await pool.query(`
      SELECT COUNT(*) as count
      FROM companies
      WHERE batch = 'W24';
    `);
    console.log(`   ✅ Batch filter query works (found ${batchTest.rows[0].count} companies from W24 batch)\n`);

    // 9. Check data integrity
    console.log('9. Checking data integrity...');
    const dataCountResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(embedding) as with_embedding
      FROM companies;
    `);
    const { total, with_embedding } = dataCountResult.rows[0];
    console.log(`   Total companies: ${total}`);
    console.log(`   Companies with embeddings: ${with_embedding}`);
    if (with_embedding === '0') {
      console.log('   ⚠️  No embeddings generated yet (expected - run Phase 2 next)\n');
    } else {
      console.log(`   ✅ ${with_embedding} companies have embeddings\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Phase 1 Verification Complete!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('  → Phase 2: Generate embeddings for all companies');
    console.log('  → Run: npx tsx scripts/generate-embeddings-bulk.ts');
    console.log('');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyPhase1().catch(console.error);
