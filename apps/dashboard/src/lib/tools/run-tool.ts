import { useToolStore } from "@/stores/tool-store";
import { requestApproval } from "./approval";
import { TOOL_REGISTRY } from "./registry";

/**
 * The single path every local tool call goes through: check the user's permission
 * setting, show an approval prompt if needed (spec §23), record the outcome to the
 * audit log (spec §50), and only then run the actual API call. Never call a
 * /api/tools/* route directly from a component — always through this.
 */
export async function runTool<T>(toolName: string, execute: () => Promise<T>): Promise<T> {
  const definition = TOOL_REGISTRY.find((t) => t.name === toolName);
  if (!definition) throw new Error(`unknown tool: ${toolName}`);

  const store = useToolStore.getState();
  const mode = store.permissions[toolName] ?? (definition.requiresConfirmation ? "ask" : "allow");

  if (mode === "disabled") {
    throw new Error(`${definition.description} is disabled in Settings → Tools`);
  }

  if (mode === "ask") {
    const id = crypto.randomUUID();
    store.setPendingApproval({ id, toolName, description: definition.description });
    const decision = await requestApproval(id);
    store.setPendingApproval(null);

    if (decision === "deny") {
      const now = new Date().toISOString();
      store.addRunRecord({
        id,
        toolName,
        riskLevel: definition.riskLevel,
        startedAt: now,
        finishedAt: now,
        approvedByUser: false,
        result: "denied",
      });
      throw new Error("denied by user");
    }
    if (decision === "always_allow") {
      store.setPermission(toolName, "allow");
    }
  }

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  try {
    const result = await execute();
    store.addRunRecord({
      id,
      toolName,
      riskLevel: definition.riskLevel,
      startedAt,
      finishedAt: new Date().toISOString(),
      approvedByUser: true,
      result: "success",
    });
    return result;
  } catch (error) {
    store.addRunRecord({
      id,
      toolName,
      riskLevel: definition.riskLevel,
      startedAt,
      finishedAt: new Date().toISOString(),
      approvedByUser: true,
      result: "failure",
      errorMessage: String(error),
    });
    throw error;
  }
}
