import { Company } from "./company.types";
import { Message } from "./llm.types";
import { Resolution } from "./sandbox.types";

export interface ResearchOrchestratorPayload {
    company: Company;
    sandboxId: string;
    vncUrl: string;
    resolution?: Resolution;
}

export interface DeepResearchAgentPayload extends ResearchOrchestratorPayload {
    initialMessage: Message;
    systemPrompt: string;
};