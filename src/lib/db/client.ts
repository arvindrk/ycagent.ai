import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let clientInstance: NeonQueryFunction<false, false> | null = null;

export function getDBClient(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!clientInstance) {
    clientInstance = neon(process.env.DATABASE_URL);
  }

  return clientInstance;
}

export function createDBClient(
  connectionString?: string
): NeonQueryFunction<false, false> {
  if (!connectionString && !process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL or connectionString is required');
  }

  return neon(connectionString || process.env.DATABASE_URL!);
}
