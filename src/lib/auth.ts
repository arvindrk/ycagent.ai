import { betterAuth } from "better-auth";
import { Pool } from "pg";

declare global {
  var _authPool: Pool | undefined;
  var _auth: ReturnType<typeof betterAuth> | undefined;
}

export function getAuth(): ReturnType<typeof betterAuth> {
  if (globalThis._auth) return globalThis._auth;

  const pool =
    globalThis._authPool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });

  if (process.env.NODE_ENV !== "production") globalThis._authPool = pool;

  globalThis._auth = betterAuth({
    database: pool,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        accessType: "offline",
        prompt: "select_account consent",
      },
    },
  }) as ReturnType<typeof betterAuth>;

  return globalThis._auth!;
}
