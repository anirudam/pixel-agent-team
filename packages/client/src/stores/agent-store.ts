import { create } from "zustand";
import type { Agent, AgentEvent } from "../types/events";

interface AgentStore {
  agents: Map<string, Agent>;
  messages: AgentEvent[];
  connected: boolean;
  setConnected: (connected: boolean) => void;
  setSnapshot: (agents: Agent[], messages: AgentEvent[]) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  addMessage: (msg: AgentEvent) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: new Map(),
  messages: [],
  connected: false,

  setConnected: (connected) => set({ connected }),

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
