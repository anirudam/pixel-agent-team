import { useEffect, useRef } from "react";
import { useAgentStore } from "../stores/agent-store";
import type { WsMessage } from "../types/events";

const WS_URL = `ws://${window.location.hostname}:5550`;
const RECONNECT_DELAY_MS = 3000;

export function useWebSocket(): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setConnected, setSnapshot, updateAgent, removeAgent, addMessage } =
    useAgentStore();

  useEffect(() => {
    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected");
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;

          switch (msg.type) {
            case "snapshot":
              setSnapshot(msg.agents, msg.messages);
              break;
            case "agent_update":
              updateAgent(msg.agent);
              break;
            case "agent_removed":
              removeAgent(msg.agentId);
              break;
            case "event":
              addMessage(msg.event);
              break;
          }
        } catch (err) {
          console.warn("[WS] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected, reconnecting...");
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error:", err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [setConnected, setSnapshot, updateAgent, removeAgent, addMessage]);
}
