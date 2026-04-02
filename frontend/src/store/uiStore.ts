import { create } from 'zustand';

interface UIState {
  query: string;
  activeTaskId: number | null;
  setQuery: (query: string) => void;
  setActiveTaskId: (taskId: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  query: '',
  activeTaskId: null,
  setQuery: (query) => set({ query }),
  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
}));
