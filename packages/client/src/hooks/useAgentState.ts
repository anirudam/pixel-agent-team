import { useMemo } from "react";
import { useAgentStore } from "../stores/agent-store";
import type { Agent } from "../types/events";

export function useAgents(): Agent[] {
  const agents = useAgentStore((s) => s.agents);
  return useMemo(() => Array.from(agents.values()), [agents]);
}

export function useAgent(id: string): Agent | undefined {
  const agents = useAgentStore((s) => s.agents);
  return agents.get(id);
}

export function useMessages() {
  return useAgentStore((s) => s.messages);
}

export function useConnected() {
  return useAgentStore((s) => s.connected);
}
