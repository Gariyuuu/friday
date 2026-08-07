export type ApprovalDecision = "allow_once" | "always_allow" | "deny";

/**
 * Approval resolvers live outside React state — a function can't be persisted or
 * serialized, and the pending-approval info shown by the modal is plain, storable
 * data. This map just bridges "user clicked a button" back to the waiting promise.
 */
const resolvers = new Map<string, (decision: ApprovalDecision) => void>();

export function requestApproval(id: string): Promise<ApprovalDecision> {
  return new Promise((resolve) => {
    resolvers.set(id, resolve);
  });
}

export function resolveApproval(id: string, decision: ApprovalDecision) {
  resolvers.get(id)?.(decision);
  resolvers.delete(id);
}
