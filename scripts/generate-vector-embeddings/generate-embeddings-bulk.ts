import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { createEmbeddingText } from './text-preparation';

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Company {
  id: string;
  name: string;
  one_liner: string | null;
  long_description: string | null;
  tags: string[];
  industries: string[];
  all_locations: string | null;
  batch: string | null;
}

async function main() {
  console.log('🚀 Starting embedding generation...\n');

  const companies = await sql`
    SELECT id, name, one_liner, long_description, tags, 
           industries, all_locations, batch
    FROM companies 
    WHERE embedding IS NULL
    ORDER BY created_at DESC
  ` as Company[];

  if (companies.length === 0) {
    console.log('✅ All companies already have embeddings');
    return;
  }

  console.log(`Found ${companies.length} companies to process\n`);

  const BATCH_SIZE = 100;
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(companies.length / BATCH_SIZE);

    try {
      const texts = batch.map(createEmbeddingText);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 768,
      });

      const embeddings = response.data.map((item) => item.embedding);

      await Promise.all(
        batch.map((company, idx) =>
          sql`
            UPDATE companies 
            SET embedding = ${JSON.stringify(embeddings[idx])}::vector
            WHERE id = ${company.id}
          `
        )
      );

      processed += batch.length;
      const progress = ((processed / companies.length) * 100).toFixed(1);
      console.log(
        `✓ Batch ${batchNum}/${totalBatches} complete (${progress}%)`
      );
      console.log(`  Processed: ${batch[0].name}, ${batch[1]?.name || ''}...`);

      if (i + BATCH_SIZE < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNum}:`, error);
      errors++;
      continue;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Embedding generation complete!`);
  console.log(`   Total processed: ${processed}/${companies.length}`);
  if (errors > 0) {
    console.log(`   ⚠️  Errors: ${errors} batches failed`);
  }
  console.log('='.repeat(50));
}

main().catch(console.error);
