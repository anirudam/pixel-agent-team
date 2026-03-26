// Agent activity states
export type AgentActivity = "idle" | "typing" | "tool_call" | "messaging";

// Agent definition parsed from .md frontmatter
export interface AgentDefinition {
  name: string;
  description: string;
  filePath: string;
}

// Runtime agent state
export interface AgentState {
  id: string;
  name: string;
  description: string;
  activity: AgentActivity;
  lastEvent: string | null;
  lastActiveAt: number;
  sessionFile: string | null;
  parentId: string | null; // parent agent id (for subagents)
}

// Parsed event from JSONL
export interface AgentEvent {
  type: string;
  agentId: string;
  slug: string;
  timestamp: number;
  content: string | null;
  contentType: "text" | "tool_use" | "tool_result" | "unknown";
  role: "user" | "assistant" | "system" | "unknown";
  sourceFile: string;
  parentId: string | null; // parent session agent id
}

// WebSocket messages sent to client
export type WsMessage =
  | { type: "snapshot"; agents: AgentState[]; messages: AgentEvent[] }
  | { type: "agent_update"; agent: AgentState }
  | { type: "agent_removed"; agentId: string }
  | { type: "event"; event: AgentEvent };

// Active session info
export interface ActiveSession {
  projectPath: string;
  sessionFile: string;
  lastModified: number;
  subagentFiles: string[];
}
