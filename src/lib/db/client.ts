import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { Pool } from 'pg';
import { getEnv } from '../env';

let clientInstance: NeonQueryFunction<false, false> | null = null;

export function getDBClient(): NeonQueryFunction<false, false> {
  const env = getEnv();

  if (!clientInstance) {
    clientInstance = neon(env.DATABASE_URL);
  }

  return clientInstance;
}

export function createDBClient(
  connectionString?: string
): NeonQueryFunction<false, false> {
  if (connectionString) {
    return neon(connectionString);
  }

  const env = getEnv();
  return neon(env.DATABASE_URL);
}

export const sql = getDBClient();

export async function runMigration(migrationSql: string) {
  const env = getEnv();

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    await pool.query(migrationSql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
