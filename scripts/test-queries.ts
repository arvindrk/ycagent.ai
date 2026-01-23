import { sql } from '../db';

async function runTestQueries() {
  console.log('Running test queries...\n');

  try {
    console.log('1. Total company count:');
    const totalCount = await sql`SELECT COUNT(*) as count FROM companies`;
    console.log(`   ${totalCount[0].count} companies\n`);

    console.log('2. Companies by source:');
    const bySource = await sql`
      SELECT source, COUNT(*) as count 
      FROM companies 
      GROUP BY source
    `;
    bySource.forEach(row => console.log(`   ${row.source}: ${row.count}`));
    console.log();

    console.log('3. Top 5 YC batches by company count:');
    const topBatches = await sql`
      SELECT batch, COUNT(*) as count 
      FROM companies 
      WHERE source = 'yc' AND batch IS NOT NULL
      GROUP BY batch 
      ORDER BY count DESC 
      LIMIT 5
    `;
    topBatches.forEach(row => console.log(`   ${row.batch}: ${row.count}`));
    console.log();

    console.log('4. Companies currently hiring:');
    const hiring = await sql`
      SELECT COUNT(*) as count 
      FROM companies 
      WHERE is_hiring = true
    `;
    console.log(`   ${hiring[0].count} companies\n`);

    console.log('5. Most common tags (top 10):');
    const topTags = await sql`
      SELECT 
        jsonb_array_elements_text(tags) as tag,
        COUNT(*) as count
      FROM companies
      WHERE source = 'yc'
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `;
    topTags.forEach(row => console.log(`   ${row.tag}: ${row.count}`));
    console.log();

    console.log('6. Sample multi-filter query (W24 + AI + Hiring):');
    const filtered = await sql`
      SELECT name, one_liner, batch, website
      FROM companies
      WHERE source = 'yc'
        AND batch = 'W24'
        AND tags @> '["AI"]'::jsonb
        AND is_hiring = true
      LIMIT 5
    `;
    filtered.forEach(row => {
      console.log(`   ${row.name} (${row.batch})`);
      console.log(`   ${row.one_liner}`);
      console.log(`   ${row.website}\n`);
    });

    console.log('7. Test name search (fuzzy match "airnb"):');
    const fuzzySearch = await sql`
      SELECT name, website
      FROM companies
      WHERE name % 'airnb'
      ORDER BY similarity(name, 'airnb') DESC
      LIMIT 3
    `;
    fuzzySearch.forEach(row => console.log(`   ${row.name} - ${row.website}`));
    console.log();

    console.log('✅ All test queries completed successfully!');
  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

runTestQueries();
