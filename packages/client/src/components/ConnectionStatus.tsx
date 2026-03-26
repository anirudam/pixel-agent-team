import { useConnected } from "../hooks/useAgentState";

export function ConnectionStatus() {
  const connected = useConnected();

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono ${
        connected
          ? "bg-green-900/40 text-green-400"
          : "bg-red-900/40 text-red-400"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-green-400 animate-pulse" : "bg-red-400"
        }`}
      />
      {connected ? "Connected" : "Disconnected - Reconnecting..."}
    </div>
  );
}
