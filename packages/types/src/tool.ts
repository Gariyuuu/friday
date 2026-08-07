import { z } from "zod";

export const ToolRiskLevel = z.enum(["low", "medium", "high", "critical"]);
export type ToolRiskLevel = z.infer<typeof ToolRiskLevel>;

export const ToolExecutionLocation = z.enum(["local", "vm", "api"]);
export type ToolExecutionLocation = z.infer<typeof ToolExecutionLocation>;

export const ToolPermissionMode = z.enum(["disabled", "ask", "allow"]);
export type ToolPermissionMode = z.infer<typeof ToolPermissionMode>;

export const ToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  executionLocation: ToolExecutionLocation,
  riskLevel: ToolRiskLevel,
  requiresConfirmation: z.boolean(),
  timeoutMs: z.number().positive(),
});
export type ToolDefinition = z.infer<typeof ToolDefinition>;

export const ToolRunRecord = z.object({
  id: z.string(),
  toolName: z.string(),
  riskLevel: ToolRiskLevel,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  approvedByUser: z.boolean(),
  result: z.enum(["success", "failure", "denied", "pending"]),
  errorMessage: z.string().optional(),
});
export type ToolRunRecord = z.infer<typeof ToolRunRecord>;
