import { useAgents, useMessages } from "../../hooks/useAgentState";
import { AgentCard } from "./AgentCard";
import type { AgentEvent } from "../../types/events";

const EVENT_TYPE_STYLES: Record<string, { dot: string; text: string }> = {
  text: { dot: "bg-blue-400", text: "text-blue-400" },
  tool_use: { dot: "bg-amber-400", text: "text-amber-400" },
  tool_result: { dot: "bg-purple-400", text: "text-purple-400" },
  unknown: { dot: "bg-gray-600", text: "text-gray-500" },
};

function EventLogItem({ event }: { event: AgentEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const style = EVENT_TYPE_STYLES[event.contentType] || EVENT_TYPE_STYLES.unknown;

  return (
    <div className="flex items-start gap-2 py-1 text-[10px] font-mono border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
      <span className="text-gray-600 shrink-0">{time}</span>
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${style.dot}`} />
      <span className={`shrink-0 ${style.text}`}>
        {event.contentType}
      </span>
      <span className="text-gray-500 truncate">
        {event.content || "-"}
      </span>
    </div>
  );
}

export function SidePanel() {
  const agents = useAgents();
  const messages = useMessages();

  const recentMessages = messages.slice(-30).reverse();
  const activeCount = agents.filter((a) => a.activity !== "idle").length;

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-amber-900/20 shadow-[-4px_0_20px_rgba(0,0,0,0.5)]">
      {/* Agents section -- takes 2/3 of space */}
      <div className="flex-[2] p-3 overflow-hidden flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-mono text-gray-300 flex items-center gap-2">
            <span className="text-amber-500">&#9632;</span>
            Agents
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-gray-500">{agents.length} total</span>
            {activeCount > 0 && (
              <>
                <span className="text-gray-700">/</span>
                <span className="text-emerald-400">{activeCount} active</span>
              </>
            )}
          </div>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {agents.length === 0 ? (
            <p className="text-xs text-gray-600 font-mono py-2 text-center">
              No active agents detected
            </p>
          ) : (
            agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          )}
        </div>
      </div>

      {/* Event log section -- takes 1/3 of space */}
      <div className="flex-1 p-3 overflow-hidden flex flex-col border-t border-gray-800/50 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-mono text-gray-300 flex items-center gap-2">
            <span className="text-blue-500">&#9632;</span>
            Event Log
          </h2>
          <span className="text-xs font-mono text-gray-600">
            {messages.length} events
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {recentMessages.length === 0 ? (
            <p className="text-xs text-gray-600 font-mono py-2 text-center">
              Waiting for events...
            </p>
          ) : (
            recentMessages.map((msg, i) => (
              <EventLogItem key={`${msg.timestamp}-${i}`} event={msg} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
