import { OfficeScene } from "./components/office/OfficeScene";
import { SidePanel } from "./components/panel/SidePanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { useWebSocket } from "./hooks/useWebSocket";

function PixelIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      style={{ imageRendering: "pixelated" }}
    >
      {/* Simple pixel art building/office icon */}
      <rect x="2" y="4" width="12" height="10" fill="#6B4226" />
      <rect x="3" y="5" width="10" height="8" fill="#8B6914" />
      {/* Windows */}
      <rect x="4" y="6" width="3" height="2" fill="#87CEEB" />
      <rect x="9" y="6" width="3" height="2" fill="#87CEEB" />
      <rect x="4" y="9" width="3" height="2" fill="#87CEEB" />
      <rect x="9" y="9" width="3" height="2" fill="#87CEEB" />
      {/* Door */}
      <rect x="6" y="10" width="4" height="3" fill="#5C3A1E" />
      {/* Roof */}
      <rect x="1" y="3" width="14" height="2" fill="#5C3A1E" />
      <rect x="3" y="2" width="10" height="2" fill="#4A3018" />
    </svg>
  );
}

export function App() {
  useWebSocket();

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-amber-900/20">
        <div className="flex items-center gap-2.5">
          <PixelIcon />
          <h1 className="text-sm font-mono text-amber-100/80 tracking-wider">
            Pixel Agent Team
          </h1>
          <span className="text-[9px] font-mono text-amber-900/60 border border-amber-900/30 rounded px-1.5 py-0.5">
            PIXEL
          </span>
        </div>
        <ConnectionStatus />
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Office canvas */}
        <main className="flex-1 flex items-center justify-center bg-gray-950 p-4">
          <OfficeScene />
        </main>

        {/* Side panel */}
        <aside className="w-80 shrink-0">
          <SidePanel />
        </aside>
      </div>
    </div>
  );
}
