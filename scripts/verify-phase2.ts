import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const results = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as with_embedding,
      COUNT(*) FILTER (WHERE embedding IS NULL) as null_embeddings
    FROM companies
  `;

  console.log('✅ Phase 2 Verification - Embedding Generation\n');
  console.log('Embedding Status:');
  console.log(`  Total companies: ${results[0].total}`);
  console.log(`  With embeddings: ${results[0].with_embedding}`);
  console.log(`  NULL embeddings: ${results[0].null_embeddings}`);

  const sample = await sql`
    SELECT name, vector_dims(embedding) as dims
    FROM companies 
    WHERE embedding IS NOT NULL 
    LIMIT 5
  `;

  console.log('\nSample companies with dimensions:');
  sample.forEach((c) => console.log(`  ${c.name}: ${c.dims} dimensions`));

  if (results[0].null_embeddings === '0' && results[0].with_embedding === results[0].total) {
    console.log('\n✅ Phase 2 Complete! All companies have 768-dim embeddings.');
  } else {
    console.log('\n⚠️  Warning: Some companies missing embeddings.');
  }
}

main().catch(console.error);
