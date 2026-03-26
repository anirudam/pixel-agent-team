import { EventEmitter } from "node:events";
import { statSync } from "node:fs";
import type { AgentEvent, AgentState, AgentActivity } from "./types.js";
import type { AgentRegistry } from "./agent-registry.js";

const IDLE_TIMEOUT_MS = 5_000;
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class StateDeriver extends EventEmitter {
  private agents = new Map<string, AgentState>();
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private recentEvents: AgentEvent[] = [];
  private maxEvents = 200;
  private agentRegistry: AgentRegistry | null = null;

  setAgentRegistry(registry: AgentRegistry): void {
    this.agentRegistry = registry;
  }

  processEvent(event: AgentEvent): void {
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents = this.recentEvents.slice(-this.maxEvents);
    }

    const agentId = event.agentId || event.slug || "main";
    let agent = this.agents.get(agentId);

    if (!agent) {
      const { name, description } = this.deriveFriendlyName(agentId, event);
      agent = {
        id: agentId,
        name,
        description,
        activity: "idle",
        lastEvent: null,
        lastActiveAt: Date.now(),
        sessionFile: event.sourceFile,
        parentId: event.parentId || null,
      };
      this.agents.set(agentId, agent);
    }

    // Capture first user text as session title/description
    if (
      (!agent.description || agent.description === "" || agent.description === "Subagent") &&
      event.role === "user" &&
      event.contentType === "text" &&
      event.content
    ) {
      // Clean up command tags, slash commands, and truncate
      let title = event.content
        .replace(/<[^>]+>/g, "") // strip XML tags
        .replace(/^\/[\w-]+\s*/g, "") // strip /command prefix
        .replace(/[\w-]+\s*\/[\w-]+\s*/g, "") // strip "command-name /command-name" pattern
        .trim();
      if (title.length > 50) title = title.slice(0, 49) + "…";
      if (title.length > 3) {
        agent.description = title;
      }
    }

    const newActivity = this.deriveActivity(event);
    agent.activity = newActivity;
    agent.lastEvent = event.content;
    agent.lastActiveAt = Date.now();
    agent.sessionFile = event.sourceFile;

    // Reset idle timer
    const existingTimer = this.idleTimers.get(agentId);
    if (existingTimer) clearTimeout(existingTimer);

    this.idleTimers.set(
      agentId,
      setTimeout(() => {
        const a = this.agents.get(agentId);
        if (a && a.activity !== "idle") {
          a.activity = "idle";
          this.emit("agent_update", a);
        }
      }, IDLE_TIMEOUT_MS)
    );

    this.emit("agent_update", { ...agent });
    this.emit("event", event);
  }

  private deriveActivity(event: AgentEvent): AgentActivity {
    if (event.contentType === "tool_use") return "tool_call";
    if (event.contentType === "text" && event.role === "assistant")
      return "typing";
    if (event.type === "team_message" || event.type === "inbox")
      return "messaging";
    return "typing";
  }

  /**
   * Remove agents whose session file hasn't been modified in STALE_THRESHOLD_MS.
   * Emits "agent_removed" for each removed agent.
   */
  cleanupStaleAgents(): void {
    const now = Date.now();

    for (const [agentId, agent] of this.agents) {
      if (!agent.sessionFile) continue;

      try {
        const fileStat = statSync(agent.sessionFile);
        const age = now - Number(fileStat.mtimeMs);
        if (age > STALE_THRESHOLD_MS) {
          console.log(`[StateDeriver] Removing stale agent: ${agentId} (${Math.round(age / 1000)}s inactive)`);
          this.agents.delete(agentId);
          const timer = this.idleTimers.get(agentId);
          if (timer) {
            clearTimeout(timer);
            this.idleTimers.delete(agentId);
          }
          this.emit("agent_removed", agentId);
        }
      } catch {
        // File might have been deleted — remove agent
        console.log(`[StateDeriver] Removing agent with missing session file: ${agentId}`);
        this.agents.delete(agentId);
        const timer = this.idleTimers.get(agentId);
        if (timer) {
          clearTimeout(timer);
          this.idleTimers.delete(agentId);
        }
        this.emit("agent_removed", agentId);
      }
    }
  }

  getSnapshot(): { agents: AgentState[]; messages: AgentEvent[] } {
    // Clean up stale agents before sending snapshot
    this.cleanupStaleAgents();
    return {
      agents: Array.from(this.agents.values()),
      messages: this.recentEvents.slice(-50),
    };
  }

  getAgent(id: string): AgentState | undefined {
    return this.agents.get(id);
  }

  /**
   * Derive a human-friendly name and description for a new agent.
   * Tries to match against known agent definitions from the registry.
   */
  private deriveFriendlyName(
    agentId: string,
    event: AgentEvent
  ): { name: string; description: string } {
    const isSubagent =
      event.sourceFile.includes("/subagents/") ||
      event.sourceFile.includes("\\subagents\\");

    // Strip "::sessionId" suffix to get display name
    const displayName = agentId.includes("::")
      ? agentId.split("::")[0]
      : agentId;

    // Try to match against agent registry definitions
    if (this.agentRegistry) {
      const slug = event.slug;
      const registryMatch =
        this.agentRegistry.get(displayName) || this.agentRegistry.get(slug);
      if (registryMatch) {
        const prefix = isSubagent ? "sub:" : "";
        return {
          name: `${prefix}${registryMatch.name}`,
          description: registryMatch.description,
        };
      }
    }

    // For subagents, the agentId from jsonl-parser already has "sub:" prefix or slug
    if (isSubagent) {
      return { name: agentId, description: "Subagent" };
    }

    // For main sessions, use project name without sessionId
    return { name: displayName, description: "" };
  }
}
