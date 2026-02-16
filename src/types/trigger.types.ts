import { Company } from "./company.types";
import { Message } from "./llm.types";
import { Resolution } from "./sandbox.types";
import { ToolSchema } from "./tool.types";

export interface ResearchOrchestratorPayload {
    company: Company;
    sandboxId: string;
    vncUrl: string;
    resolution?: Resolution;
}

export interface DeepResearchAgentPayload extends ResearchOrchestratorPayload {
    domain: string;
    tools: ToolSchema[];
    initialMessage: Message;
    systemPrompt: string;
}

export interface DomainResearchResult {
    domain: string;
    sandboxId: string;
    vncUrl: string;
};