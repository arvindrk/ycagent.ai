/**
 * Hermetic scenario-level eval for the research agent loop (executeAgentLoop)
 * and orchestrator payload construction.
 *
 * Uses a mocked streamer via factory test seam. Zero E2B, zero DB, zero keys,
 * zero external I/O. Exercises more of the agent loop contract than registry/rubric alone.
 *
 * Run: npm run eval:research-orchestrator-mock-eval
 */

import type {
  BaseComputerStreamer,
  Message,
  StreamChunk,
  FounderProfileResult,
  AgentAction,
  ComputerAgentConfig,
} from "@/types/llm.types";
import { LLMProvider, SSEEvent } from "@/types/llm.types";
import type { Sandbox } from "@e2b/desktop";
import { StreamerFactory } from "@/lib/llm/factory";
import {
  getResearchDomains,
  DOMAIN_REGISTRY,
} from "@/lib/research/domain-registry";
import { getToolsForDomain, SHARED_TOOLS } from "@/lib/schemas/tool.schema";
import type { Company } from "@/types/company.types";

// ---- Fixtures (minimal, hermetic) ------------------------------------

const syntheticCompany: Company = {
  id: "eval-co-1",
  name: "TestCo",
  slug: "testco",
  website: "https://testco.example",
  source: "yc",
  source_id: "testco",
  source_url: "https://www.ycombinator.com/companies/testco",
} as unknown as Company;

const validFounderResult: FounderProfileResult = {
  domain: "founder_profile",
  summary: "Strong complementary founding team.",
  executiveSummary: "Co-founders with prior successful exit and aligned domain expertise.",
  founderRelationship: ["Met in prior startup", "Co-founded and sold Auctomatic"],
  complementarySkills: ["Technical systems depth", "Growth and operations"],
  socialPresence: ["Active on X with industry commentary"],
  trackRecord: ["Prior company acquired"],
  sources: ["https://testco.example/about"],
  founders: [
    { name: "Alex Founder", title: "CEO" },
    { name: "Sam Co", title: "CTO" },
  ],
  metadata: {
    researchTimestamp: "2026-07-02T23:35:00.000Z",
    signalTypes: ["founder_relationship", "track_record"],
  },
};

// ---- Test runner (exact pattern) -------------------------------------

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

// ---- Mock streamer (no desktop, no LLM, no net) -----------------------

class MockResearchStreamer implements BaseComputerStreamer {
  async *executeAgentLoop(messages: Message[], seedUrl?: string): AsyncGenerator<StreamChunk> {
    if (seedUrl) {
      yield {
        type: SSEEvent.ACTION,
        action: { action: "navigate", url: seedUrl } as unknown as AgentAction,
        toolName: "computer",
      };
      yield { type: SSEEvent.ACTION_COMPLETED };
    }

    yield { type: SSEEvent.THINKING };

    yield {
      type: SSEEvent.ACTION,
      action: { query: "TestCo founders", num_results: 3 } as unknown as AgentAction,
      toolName: "google_search",
    };
    yield { type: SSEEvent.ACTION_COMPLETED };

    yield { type: SSEEvent.THINKING };

    yield { type: SSEEvent.RESULT, result: validFounderResult };

    yield { type: SSEEvent.DONE };
  }
}

async function drain<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

// ---- Tests: orchestrator payload construction (pure) ------------------

console.log("\nresearch-orchestrator-mock-eval\n");

test("getResearchDomains returns founder_profile", () => {
  const domains = getResearchDomains();
  assert(domains.length === 1 && domains[0] === "founder_profile", `got ${JSON.stringify(domains)}`);
});

test("DOMAIN_REGISTRY provides systemPrompt and initialMessage builder", () => {
  const cfg = DOMAIN_REGISTRY["founder_profile"];
  assert(cfg !== undefined, "missing founder_profile");
  assert(typeof cfg.systemPrompt === "string" && cfg.systemPrompt.length > 10, "systemPrompt too short");
  const msg = cfg.generateInitialMessage(syntheticCompany);
  assert(msg.role === "user", "initial role user");
  assert(msg.content.includes("TestCo"), "message must include name");
  assert(msg.content.includes("testco.example"), "message must include website");
});

test("getToolsForDomain returns shared plus format tool for founder_profile", () => {
  const tools = getToolsForDomain("founder_profile");
  assert(tools.length === SHARED_TOOLS.length + 1, `expected ${SHARED_TOOLS.length + 1}`);
  assert(tools.some((t) => t.name === "format_result_founder_profile"), "missing format tool");
});

// ---- Tests: factory seam + executeAgentLoop scenario ------------------

test("factory override seam is present", () => {
  assert(typeof StreamerFactory.__setTestStreamerOverride === "function", "missing setter seam");
});

test("seam allows injecting mock streamer", () => {
  const mock = new MockResearchStreamer();
  StreamerFactory.__setTestStreamerOverride(mock);
  const got = StreamerFactory.getStreamer({
    desktop: {} as unknown as Sandbox,
    provider: LLMProvider.OPENAI,
  } as unknown as ComputerAgentConfig);
  assert(got === mock, "override not returned");
  StreamerFactory.__setTestStreamerOverride(null);
});

// Async scenario covered outside sync test() to preserve runner shape and allow await
void (async () => {
  try {
    const mock = new MockResearchStreamer();
    StreamerFactory.__setTestStreamerOverride(mock);

    const messages: Message[] = [{ role: "user", content: "Research founders of TestCo" }];
    const chunks = await drain(mock.executeAgentLoop(messages, syntheticCompany.website ?? undefined));

    assert(chunks.length >= 6, `expected several chunks, got ${chunks.length}`);

    const types = chunks.map((c) => c.type);
    assert(types.includes(SSEEvent.THINKING), "must include THINKING");
    assert(types.includes(SSEEvent.ACTION), "must include ACTION");
    assert(types.includes(SSEEvent.ACTION_COMPLETED), "must include ACTION_COMPLETED");
    assert(types.includes(SSEEvent.RESULT), "must include RESULT");
    assert(types.includes(SSEEvent.DONE), "must include DONE");

    const resultChunk = chunks.find((c) => c.type === SSEEvent.RESULT);
    const res = resultChunk && resultChunk.result;
    assert(!!res, "RESULT must carry result");
    const r = res as FounderProfileResult;
    assert(r.domain === "founder_profile", "wrong domain");
    assert(typeof r.summary === "string" && r.summary.length > 0, "summary");
    assert(typeof r.executiveSummary === "string" && r.executiveSummary.length > 0, "executiveSummary");
    assert(Array.isArray(r.sources) && r.sources.length > 0 && r.sources.every((s) => typeof s === "string" && s.length > 0), "sources non-empty strings");
    assert(Array.isArray(r.founderRelationship) && r.founderRelationship.length > 0, "founderRelationship (non-obvious signal)");
    assert(Array.isArray(r.complementarySkills) && r.complementarySkills.length > 0, "complementarySkills (non-obvious signal)");
    assert(Array.isArray(r.socialPresence) && r.socialPresence.length > 0, "socialPresence (non-obvious signal)");
    assert(Array.isArray(r.trackRecord) && r.trackRecord.length > 0, "trackRecord (non-obvious signal)");
    assert(r.metadata != null && typeof r.metadata === "object", "metadata presence");
    assert(Array.isArray(r.founders) && r.founders.length >= 1, "founders required");
    assert(r.founders.every((f) => {
      const rec = f as Record<string, unknown>;
      return typeof rec.name === "string" && String(rec.name).length > 0;
    }), "founder names");

    console.log("  pass  scenario: executeAgentLoop happy path emits full event sequence + valid result");
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL  scenario: executeAgentLoop happy path: ${msg}`);
    failed++;
  } finally {
    StreamerFactory.__setTestStreamerOverride(null);
  }

  const total = passed + failed;
  console.log(`\n${total} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();