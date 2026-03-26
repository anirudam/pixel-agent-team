import type { Agent, AgentActivity } from "../../types/events";

const ACTIVITY_STYLES: Record<
  AgentActivity,
  { bg: string; text: string; label: string; dot: string; border: string }
> = {
  idle: {
    bg: "bg-gray-800/50",
    text: "text-gray-400",
    label: "Idle",
    dot: "bg-gray-500",
    border: "border-gray-700/50",
  },
  typing: {
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    label: "Typing",
    dot: "bg-blue-400",
    border: "border-blue-800/30",
  },
  tool_call: {
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    label: "Tool Call",
    dot: "bg-amber-400",
    border: "border-amber-800/30",
  },
  messaging: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    label: "Messaging",
    dot: "bg-emerald-400",
    border: "border-emerald-800/30",
  },
};

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const style = ACTIVITY_STYLES[agent.activity];
  const isActive = agent.activity !== "idle";

  return (
    <div
      className={`${style.bg} rounded-lg p-3 border ${style.border} transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${style.dot} ${
              isActive ? "animate-pulse" : ""
            }`}
          />
          <span className="font-mono text-sm text-gray-200 truncate">
            {agent.name}
          </span>
        </div>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${style.text} ${style.bg} border ${style.border}`}
        >
          {style.label}
        </span>
      </div>
      {agent.description && (
        <p className="text-[10px] text-gray-400 font-mono mt-0.5 pl-4 truncate" title={agent.description}>
          {agent.description}
        </p>
      )}
      {agent.parentId && (
        <p className="text-[10px] text-amber-500/70 font-mono mt-0.5 pl-4">
          ← spawned by {agent.parentId}
        </p>
      )}
      {agent.lastEvent && (
        <p className="text-xs text-gray-500 truncate font-mono mt-1 pl-4">
          {agent.lastEvent}
        </p>
      )}
    </div>
  );
}
