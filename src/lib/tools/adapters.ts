import { ToolSchema } from "@/types/tool.types";

export function toAnthropicToolSchema(schema: ToolSchema) {
  return {
    name: schema.name,
    description: schema.description,
    input_schema: schema.inputSchema
  };
}

export function toOpenAIToolSchema(schema: ToolSchema) {
  return {
    type: "function" as const,
    name: schema.name,
    description: schema.description,
    parameters: schema.inputSchema,
    strict: false
  };
}

export function toGoogleToolSchema(schema: ToolSchema) {
  return {
    name: schema.name,
    description: schema.description,
    parametersJsonSchema: schema.inputSchema
  };
}
