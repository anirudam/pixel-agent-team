import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { AgentState, AgentEvent, WsMessage } from "../state/types.js";
import type { StateDeriver } from "../state/state-deriver.js";

export class WebSocketHub {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: Server, private stateDeriver: StateDeriver) {
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws) => {
      console.log("[WebSocketHub] Client connected");
      this.clients.add(ws);

      // Send current snapshot on connect
      const snapshot = this.stateDeriver.getSnapshot();
      const msg: WsMessage = {
        type: "snapshot",
        agents: snapshot.agents,
        messages: snapshot.messages,
      };
      ws.send(JSON.stringify(msg));

      ws.on("close", () => {
        console.log("[WebSocketHub] Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (err) => {
        console.error("[WebSocketHub] Client error:", err);
        this.clients.delete(ws);
      });
    });
  }

  broadcastAgentUpdate(agent: AgentState): void {
    const msg: WsMessage = { type: "agent_update", agent };
    this.broadcast(msg);
  }

  broadcastAgentRemoved(agentId: string): void {
    const msg: WsMessage = { type: "agent_removed", agentId };
    this.broadcast(msg);
  }

  broadcastEvent(event: AgentEvent): void {
    const msg: WsMessage = { type: "event", event };
    this.broadcast(msg);
  }

  private broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
