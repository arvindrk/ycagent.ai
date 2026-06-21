import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";

let _handler: ReturnType<typeof toNextJsHandler> | null = null;
function getHandler() {
  return (_handler ??= toNextJsHandler(getAuth()));
}

export function GET(req: NextRequest) {
  return getHandler().GET(req);
}

export function POST(req: NextRequest) {
  return getHandler().POST(req);
}
