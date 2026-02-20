import { auth } from "./auth";

const DISABLE_AUTH = process.env.IS_DEV_MODE === "true";

const DEV_SESSION = {
  user: { id: "dev-user", email: "dev@local.test", name: "Dev User" },
};

export async function getSession(headers: Headers) {
  if (DISABLE_AUTH) return DEV_SESSION;
  return auth.api.getSession({ headers });
}
