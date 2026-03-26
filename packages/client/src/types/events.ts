export type AgentActivity = "idle" | "typing" | "tool_call" | "messaging";

export interface Agent {
  id: string;
  name: string;
  description: string;
  activity: AgentActivity;
  lastEvent: string | null;
  lastActiveAt: number;
  sessionFile: string | null;
  parentId: string | null;
}

export interface AgentEvent {
  type: string;
  agentId: string;
  slug: string;
  timestamp: number;
  content: string | null;
  contentType: "text" | "tool_use" | "tool_result" | "unknown";
  role: "user" | "assistant" | "system" | "unknown";
  sourceFile: string;
}

export type WsMessage =
  | { type: "snapshot"; agents: Agent[]; messages: AgentEvent[] }
  | { type: "agent_update"; agent: Agent }
  | { type: "agent_removed"; agentId: string }
  | { type: "event"; event: AgentEvent };
