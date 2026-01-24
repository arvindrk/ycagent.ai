import { runMigration } from '../db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  try {
    const migrationFile = process.argv[2] || '002_add_vector_search.sql';

    console.log(`Running migration: ${migrationFile}\n`);

    const migrationPath = join(__dirname, '../db/migrations', migrationFile);
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    await runMigration(migrationSql);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
