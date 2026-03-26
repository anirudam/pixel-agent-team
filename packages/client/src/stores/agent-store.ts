import { create } from "zustand";
import type { Agent, AgentEvent } from "../types/events";

interface AgentStore {
  agents: Map<string, Agent>;
  messages: AgentEvent[];
  connected: boolean;
  sidebarOpen: boolean;
  zoom: number;
  deskCols: number;
  setConnected: (connected: boolean) => void;
  setSnapshot: (agents: Agent[], messages: AgentEvent[]) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  addMessage: (msg: AgentEvent) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setDeskCols: (cols: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: new Map(),
  messages: [],
  connected: false,
  sidebarOpen: true,
  zoom: 1,
  deskCols: 3,

  setConnected: (connected) => set({ connected }),
  setDeskCols: (cols) => set({ deskCols: Math.min(6, Math.max(1, cols)) }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.3, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.15) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.3, state.zoom - 0.15) })),
  resetZoom: () => set({ zoom: 1 }),

  setSnapshot: (agents, messages) =>
    set({
      agents: new Map(agents.map((a) => [a.id, a])),
      messages,
    }),

  updateAgent: (agent) =>
    set((state) => {
      const next = new Map(state.agents);
      next.set(agent.id, agent);
      return { agents: next };
    }),

  removeAgent: (agentId) =>
    set((state) => {
      const next = new Map(state.agents);
      next.delete(agentId);
      return { agents: next };
    }),

  addMessage: (msg) =>
    set((state) => {
      const messages = [...state.messages, msg];
      // Keep only last 200 messages
      return { messages: messages.slice(-200) };
    }),
}));
