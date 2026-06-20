import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".claude-flow/**",
    ".swarm/**",
    ".codex/worktrees/**",
    ".codex/logs/**",
    ".codex/tmp/**",
    "agent/brain/**",
    // logview is a standalone tsx-run tool with its own tsconfig
    // (allowImportingTsExtensions, ink/react-jsx); typechecked via
    // `npx tsc -p agent/local/logview/tsconfig.json --noEmit`.
    "agent/local/logview/**",
  ]),
]);

export default eslintConfig;
