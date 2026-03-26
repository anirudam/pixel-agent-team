import { OfficeScene } from "./components/office/OfficeScene";
import { SidePanel } from "./components/panel/SidePanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAgentStore } from "./stores/agent-store";

function PixelIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      style={{ imageRendering: "pixelated" }}
    >
      <rect x="2" y="4" width="12" height="10" fill="#6B4226" />
      <rect x="3" y="5" width="10" height="8" fill="#8B6914" />
      <rect x="4" y="6" width="3" height="2" fill="#87CEEB" />
      <rect x="9" y="6" width="3" height="2" fill="#87CEEB" />
      <rect x="4" y="9" width="3" height="2" fill="#87CEEB" />
      <rect x="9" y="9" width="3" height="2" fill="#87CEEB" />
      <rect x="6" y="10" width="4" height="3" fill="#5C3A1E" />
      <rect x="1" y="3" width="14" height="2" fill="#5C3A1E" />
      <rect x="3" y="2" width="10" height="2" fill="#4A3018" />
    </svg>
  );
}

function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useAgentStore();
  return (
    <button
      onClick={toggleSidebar}
      className="p-1.5 rounded border border-amber-900/30 hover:bg-amber-900/20 transition-colors cursor-pointer"
      title={sidebarOpen ? "Hide panel" : "Show panel"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="text-amber-100/60"
      >
        {sidebarOpen ? (
          <>
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 6L5 8L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 6L7 8L5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </button>
  );
}

function ColsControl() {
  const { deskCols, setDeskCols } = useAgentStore();
  return (
    <div className="flex items-center gap-1 bg-gray-900/80 border border-amber-900/30 rounded-lg px-1.5 py-0.5">
      <button
        onClick={() => setDeskCols(deskCols - 1)}
        className="w-6 h-6 flex items-center justify-center text-amber-100/60 hover:text-amber-100 hover:bg-amber-900/20 rounded transition-colors cursor-pointer font-mono text-sm"
        title="Fewer columns"
      >
        −
      </button>
      <span
        className="px-1 h-6 flex items-center justify-center text-[10px] font-mono text-gray-400 min-w-[3rem] text-center"
        title="Desk columns"
      >
        {deskCols} cols
      </span>
      <button
        onClick={() => setDeskCols(deskCols + 1)}
        className="w-6 h-6 flex items-center justify-center text-amber-100/60 hover:text-amber-100 hover:bg-amber-900/20 rounded transition-colors cursor-pointer font-mono text-sm"
        title="More columns"
      >
        +
      </button>
    </div>
  );
}

function ZoomControls() {
  const { zoom, zoomIn, zoomOut, resetZoom } = useAgentStore();
  const pct = Math.round(zoom * 100);
  return (
    <div className="flex items-center gap-1 bg-gray-900/80 border border-amber-900/30 rounded-lg px-1.5 py-0.5">
      <button
        onClick={zoomOut}
        className="w-6 h-6 flex items-center justify-center text-amber-100/60 hover:text-amber-100 hover:bg-amber-900/20 rounded transition-colors cursor-pointer font-mono text-sm"
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={resetZoom}
        className="px-1.5 h-6 flex items-center justify-center text-[10px] font-mono text-gray-400 hover:text-amber-100 hover:bg-amber-900/20 rounded transition-colors cursor-pointer min-w-[3rem]"
        title="Reset zoom"
      >
        {pct}%
      </button>
      <button
        onClick={zoomIn}
        className="w-6 h-6 flex items-center justify-center text-amber-100/60 hover:text-amber-100 hover:bg-amber-900/20 rounded transition-colors cursor-pointer font-mono text-sm"
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}

export function App() {
  useWebSocket();
  const sidebarOpen = useAgentStore((s) => s.sidebarOpen);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-3 py-2 bg-gray-950 border-b border-amber-900/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <PixelIcon />
          <h1 className="text-sm font-mono text-amber-100/80 tracking-wider hidden sm:block">
            Pixel Agent Team
          </h1>
          <span className="text-[9px] font-mono text-amber-900/60 border border-amber-900/30 rounded px-1.5 py-0.5 hidden sm:inline">
            PIXEL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ColsControl />
          <ZoomControls />
          <SidebarToggle />
          <ConnectionStatus />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Office canvas */}
        <main className="flex-1 overflow-auto">
          <OfficeScene />
        </main>

        {/* Side panel - slide in/out */}
        <aside
          className={`
            fixed md:relative right-0 top-0 md:top-auto h-full z-30
            w-80 shrink-0 transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <SidePanel />
        </aside>

        {/* Overlay backdrop on mobile when sidebar open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => useAgentStore.getState().toggleSidebar()}
          />
        )}
      </div>
    </div>
  );
}
