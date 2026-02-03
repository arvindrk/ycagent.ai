import { runMigration } from '../src/lib/db/client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    const migrationFile = process.argv[2] || '007_create_discovered_urls_table.sql';

    console.log(`Running migration: ${migrationFile}\n`);

    const migrationPath = join(__dirname, '../src/lib/db/migrations', migrationFile);
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    await runMigration(migrationSql);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
