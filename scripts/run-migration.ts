import { readFileSync } from 'fs';
import { join } from 'path';
import { runMigration } from '../db';

async function main() {
  try {
    console.log('Running database migration...\n');
    
    const migrationPath = join(__dirname, '../db/migrations/001_create_companies.sql');
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    
    await runMigration(migrationSql);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
