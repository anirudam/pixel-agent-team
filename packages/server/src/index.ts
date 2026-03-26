import express from "express";
import { createServer } from "node:http";
import { FileWatcher } from "./watcher/file-watcher.js";
import { JsonlParser } from "./watcher/jsonl-parser.js";
import { SessionScanner } from "./watcher/session-scanner.js";
import { AgentRegistry } from "./state/agent-registry.js";
import { StateDeriver } from "./state/state-deriver.js";
import { WebSocketHub } from "./ws/hub.js";
import type { AgentState, AgentEvent } from "./state/types.js";

const PORT = 5550;

async function main(): Promise<void> {
  const app = express();
  const server = createServer(app);

  // Initialize components
  const agentRegistry = new AgentRegistry();
  await agentRegistry.load();

  const stateDeriver = new StateDeriver();
  stateDeriver.setAgentRegistry(agentRegistry);
  const jsonlParser = new JsonlParser();
  const fileWatcher = new FileWatcher();
  const sessionScanner = new SessionScanner();
  const wsHub = new WebSocketHub(server, stateDeriver);

  // Wire: FileWatcher -> JsonlParser -> StateDeriver -> WebSocketHub
  fileWatcher.on("file_changed", (filePath: string) => {
    jsonlParser.parseNewLines(filePath);
  });

  jsonlParser.on("event", (event: AgentEvent) => {
    stateDeriver.processEvent(event);
  });

  stateDeriver.on("agent_update", (agent: AgentState) => {
    wsHub.broadcastAgentUpdate(agent);
  });

  stateDeriver.on("event", (event: AgentEvent) => {
    wsHub.broadcastEvent(event);
  });

  stateDeriver.on("agent_removed", (agentId: string) => {
    wsHub.broadcastAgentRemoved(agentId);
  });

  // Cleanup stale agents every 30 seconds
  setInterval(() => {
    stateDeriver.cleanupStaleAgents();
  }, 30_000);

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      clients: wsHub.getClientCount(),
      agents: agentRegistry.getAll().size,
    });
  });

  // List agents endpoint
  app.get("/api/agents", (_req, res) => {
    const agents = Array.from(agentRegistry.getAll().values());
    res.json(agents);
  });

  // Active sessions endpoint
  app.get("/api/sessions", async (_req, res) => {
    const sessions = await sessionScanner.scanActiveSessions();
    res.json(sessions);
  });

  // Start file watcher
  fileWatcher.start();

  // Periodic session scan
  setInterval(async () => {
    const sessions = await sessionScanner.scanActiveSessions();
    if (sessions.length > 0) {
      console.log(
        `[Server] Active sessions: ${sessions.length}, files: ${sessions.map((s) => s.sessionFile).join(", ")}`
      );
    }
  }, 30_000);

  server.listen(PORT, () => {
    console.log(`[Server] Claude Office Monitor running on http://localhost:${PORT}`);
    console.log(`[Server] WebSocket available on ws://localhost:${PORT}`);
    console.log(`[Server] Agent definitions: ${agentRegistry.getAll().size}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
