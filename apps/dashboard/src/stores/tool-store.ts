import type { ToolPermissionMode, ToolRiskLevel, ToolRunRecord } from "@friday/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TOOL_PERMISSIONS } from "@/lib/tools/registry";

export interface PendingApproval {
  id: string;
  toolName: string;
  description: string;
  riskLevel: ToolRiskLevel;
}

const MAX_HISTORY = 50;

interface ToolStoreState {
  permissions: Record<string, ToolPermissionMode>;
  runHistory: ToolRunRecord[];
  pendingApproval: PendingApproval | null;
  setPermission: (toolName: string, mode: ToolPermissionMode) => void;
  addRunRecord: (record: ToolRunRecord) => void;
  setPendingApproval: (approval: PendingApproval | null) => void;
}

export const useToolStore = create<ToolStoreState>()(
  persist(
    (set) => ({
      permissions: DEFAULT_TOOL_PERMISSIONS,
      runHistory: [],
      pendingApproval: null,
      setPermission: (toolName, mode) =>
        set((s) => ({ permissions: { ...s.permissions, [toolName]: mode } })),
      addRunRecord: (record) =>
        set((s) => ({ runHistory: [record, ...s.runHistory].slice(0, MAX_HISTORY) })),
      setPendingApproval: (approval) => set({ pendingApproval: approval }),
    }),
    {
      name: "friday-tool-store",
      partialize: (s) => ({ permissions: s.permissions, runHistory: s.runHistory }),
    },
  ),
);
