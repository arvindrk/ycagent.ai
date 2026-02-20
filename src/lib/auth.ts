import { betterAuth } from "better-auth";
import { Pool } from "pg";

declare global {
  var _authPool: Pool | undefined;
}

const pool =
  globalThis._authPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") globalThis._authPool = pool;

export const auth = betterAuth({
  database: pool,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
});
