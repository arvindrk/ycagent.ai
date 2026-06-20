/**
 * Smoke eval for the YC research agent.
 * Validates structural invariants of the tool registry, domain registry,
 * and FounderProfileResult rubric without live API calls or env vars.
 *
 * Run: npm run eval:research-smoke
 */

import type { FounderProfileResult } from "@/types/llm.types";
import type { Company } from "@/types/company.types";
import {
  getToolsForDomain,
  SHARED_TOOLS,
  founderProfileResultToolSchema,
  DOMAIN_RESULT_TOOLS,
} from "@/lib/schemas/tool.schema";
import {
  getResearchDomains,
  DOMAIN_REGISTRY,
} from "@/lib/research/domain-registry";

// ---- Synthetic fixtures ------------------------------------------------

const syntheticCompany = {
  id: "eval-company-1",
  name: "Stripe",
  slug: "stripe",
  website: "https://stripe.com",
  source: "yc",
  source_id: "stripe",
  source_url: "https://www.ycombinator.com/companies/stripe",
} as unknown as Company;

const validResult: FounderProfileResult = {
  domain: "founder_profile",
  summary: "Strong technical founding team with complementary fintech experience.",
  executiveSummary:
    "Two co-founders with deep fintech backgrounds and a proven prior collaboration.",
  founderRelationship: [
    "Met at MIT while working on a payments project",
    "Co-founded Auctomatic before Stripe",
  ],
  complementarySkills: [
    "Patrick: deep technical expertise in distributed systems",
    "John: business development and growth strategy",
  ],
  socialPresence: [
    "Patrick has 500k+ X followers and writes on technology policy",
    "John is active on LinkedIn with regular fintech commentary",
  ],
  trackRecord: [
    "Auctomatic acquired by Live Current Media in 2008",
    "Stripe grew from YC S09 to 100B+ valuation",
  ],
  sources: [
    "https://stripe.com/about",
    "https://linkedin.com/in/patrick-collison",
    "https://twitter.com/patrickc",
  ],
  founders: [
    {
      name: "Patrick Collison",
      title: "CEO",
      education: ["MIT (dropped out)"],
      previousCompanies: ["Auctomatic (acquired by Live Current Media)"],
      achievements: ["Forbes 30 Under 30"],
      socialLinks: {
        linkedin: "https://linkedin.com/in/patrick-collison",
        x: "patrickc",
      },
    },
    {
      name: "John Collison",
      title: "President",
      education: ["Harvard (dropped out)"],
      previousCompanies: ["Auctomatic (acquired by Live Current Media)"],
      achievements: ["Youngest self-made billionaire at the time"],
      socialLinks: { x: "collision" },
    },
  ],
};

// ---- Rubric -----------------------------------------------------------

interface RubricResult {
  pass: boolean;
  failures: string[];
}

const BOUNDED_ARRAY_FIELDS = [
  "founderRelationship",
  "complementarySkills",
  "socialPresence",
  "trackRecord",
] as const;

function checkRubric(result: unknown): RubricResult {
  const failures: string[] = [];

  if (typeof result !== "object" || result === null) {
    return { pass: false, failures: ["result is not an object"] };
  }

  const r = result as Record<string, unknown>;

  if (r["domain"] !== "founder_profile") {
    failures.push("domain must be 'founder_profile'");
  }
  if (typeof r["executiveSummary"] !== "string" || r["executiveSummary"] === "") {
    failures.push("executiveSummary must be a non-empty string");
  }
  if (typeof r["summary"] !== "string" || r["summary"] === "") {
    failures.push("summary must be a non-empty string");
  }

  for (const field of BOUNDED_ARRAY_FIELDS) {
    const arr = r[field];
    if (!Array.isArray(arr)) {
      failures.push(`${field} must be an array`);
    } else if (arr.length < 1) {
      failures.push(`${field} must have at least 1 item`);
    } else if (arr.length > 3) {
      failures.push(`${field} must have at most 3 items`);
    } else if (arr.some((item) => typeof item !== "string" || item === "")) {
      failures.push(`${field} items must be non-empty strings`);
    }
  }

  const sources = r["sources"];
  if (!Array.isArray(sources) || sources.length === 0) {
    failures.push("sources must be a non-empty array");
  }

  const founders = r["founders"];
  if (!Array.isArray(founders) || founders.length === 0) {
    failures.push("founders must be a non-empty array");
  } else {
    for (const [i, founder] of founders.entries()) {
      if (typeof founder !== "object" || founder === null) {
        failures.push(`founders[${i}] must be an object`);
      } else {
        const f = founder as Record<string, unknown>;
        if (typeof f["name"] !== "string" || f["name"] === "") {
          failures.push(`founders[${i}].name must be a non-empty string`);
        }
        if (typeof f["title"] !== "string" || f["title"] === "") {
          failures.push(`founders[${i}].title must be a non-empty string`);
        }
      }
    }
  }

  return { pass: failures.length === 0, failures };
}

// ---- Test runner ------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  pass  ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL  ${name}: ${msg}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ---- Tests ------------------------------------------------------------

console.log("\nresearch-agent eval: smoke\n");

// Tool registry
test("getResearchDomains returns [founder_profile]", () => {
  const domains = getResearchDomains();
  assert(
    domains.length === 1 && domains[0] === "founder_profile",
    `expected ['founder_profile'], got ${JSON.stringify(domains)}`,
  );
});

test("getToolsForDomain('founder_profile') returns shared + result tools", () => {
  const tools = getToolsForDomain("founder_profile");
  assert(
    tools.length === SHARED_TOOLS.length + 1,
    `expected ${SHARED_TOOLS.length + 1} tools, got ${tools.length}`,
  );
  assert(
    tools.some((t) => t.name === "format_result_founder_profile"),
    "result tool 'format_result_founder_profile' missing",
  );
});

test("getToolsForDomain includes all shared tools", () => {
  const tools = getToolsForDomain("founder_profile");
  const names = new Set(tools.map((t) => t.name));
  for (const shared of SHARED_TOOLS) {
    assert(names.has(shared.name), `missing shared tool: ${shared.name}`);
  }
});

test("getToolsForDomain throws on unknown domain", () => {
  let threw = false;
  try {
    getToolsForDomain("__nonexistent_domain__");
  } catch {
    threw = true;
  }
  assert(threw, "expected an error for unknown domain");
});

test("DOMAIN_RESULT_TOOLS contains founder_profile", () => {
  assert(
    "founder_profile" in DOMAIN_RESULT_TOOLS,
    "founder_profile missing from DOMAIN_RESULT_TOOLS",
  );
  assert(
    DOMAIN_RESULT_TOOLS["founder_profile"] === founderProfileResultToolSchema,
    "wrong schema reference for founder_profile",
  );
});

test("founderProfileResultToolSchema requires all mandatory fields", () => {
  const required = founderProfileResultToolSchema.inputSchema.required ?? [];
  const mandatory = [
    "domain",
    "executiveSummary",
    "founderRelationship",
    "complementarySkills",
    "socialPresence",
    "trackRecord",
    "sources",
    "founders",
  ];
  for (const field of mandatory) {
    assert(required.includes(field), `'${field}' missing from required[]`);
  }
});

// Domain registry
test("DOMAIN_REGISTRY has founder_profile config", () => {
  assert(
    "founder_profile" in DOMAIN_REGISTRY,
    "founder_profile missing from DOMAIN_REGISTRY",
  );
  assert(
    typeof DOMAIN_REGISTRY["founder_profile"]?.systemPrompt === "string",
    "systemPrompt must be a string",
  );
});

test("generateInitialMessage includes company name and website", () => {
  const config = DOMAIN_REGISTRY["founder_profile"];
  assert(config !== undefined, "missing founder_profile config");
  const msg = config.generateInitialMessage(syntheticCompany);
  assert(msg.role === "user", `expected role 'user', got '${msg.role}'`);
  assert(
    msg.content.includes("Stripe"),
    `message must contain company name; got: ${msg.content}`,
  );
  assert(
    msg.content.includes("stripe.com"),
    `message must contain website; got: ${msg.content}`,
  );
});

// Rubric: valid result
test("rubric passes valid FounderProfileResult", () => {
  const { pass, failures } = checkRubric(validResult);
  assert(pass, `rubric unexpectedly failed: ${failures.join("; ")}`);
});

// Rubric: invalid results
test("rubric catches wrong domain value", () => {
  const { pass } = checkRubric({ ...validResult, domain: "investor_profile" });
  assert(!pass, "expected rubric failure for wrong domain");
});

test("rubric catches empty founderRelationship", () => {
  const { pass } = checkRubric({ ...validResult, founderRelationship: [] });
  assert(!pass, "expected rubric failure for empty founderRelationship");
});

test("rubric catches founderRelationship exceeding max items", () => {
  const { pass } = checkRubric({
    ...validResult,
    founderRelationship: ["a", "b", "c", "d"],
  });
  assert(!pass, "expected rubric failure for >3 items in founderRelationship");
});

test("rubric catches empty sources array", () => {
  const { pass } = checkRubric({ ...validResult, sources: [] });
  assert(!pass, "expected rubric failure for empty sources");
});

test("rubric catches empty founders array", () => {
  const { pass } = checkRubric({ ...validResult, founders: [] });
  assert(!pass, "expected rubric failure for empty founders");
});

test("rubric catches founder missing required name", () => {
  const { pass } = checkRubric({
    ...validResult,
    founders: [{ title: "CEO" }],
  });
  assert(!pass, "expected rubric failure for founder missing name");
});

test("rubric catches missing executiveSummary", () => {
  const partial = { ...validResult } as Record<string, unknown>;
  delete partial["executiveSummary"];
  const { pass } = checkRubric(partial);
  assert(!pass, "expected rubric failure for missing executiveSummary");
});

// ---- Summary ----------------------------------------------------------

const total = passed + failed;
console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
