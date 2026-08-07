import { create } from "zustand";

interface Toast {
  id: string;
  text: string;
  tone: "success" | "error";
}

interface ToastStoreState {
  toast: Toast | null;
  show: (text: string, tone: Toast["tone"]) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toast: null,
  show: (text, tone) => {
    const id = crypto.randomUUID();
    set({ toast: { id, text, tone } });
    setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, 3500);
  },
  clear: () => set({ toast: null }),
}));
