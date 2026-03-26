# Pixel Agent Team

A real-time pixel-art office visualization for monitoring Claude Code agent activity. Watch your AI agents work together in a retro-style virtual office as they execute tasks, call tools, and collaborate.

![Pixel Agent Team Demo](./pixel-agent-team.gif)

> **Works everywhere Claude Code runs** -- unlike terminal-only monitors, Pixel Agent Team works with **both** the CLI and VS Code Extension, giving you a unified view of all your agents no matter how you use Claude Code.

## Works With

| Platform | Support | How |
|----------|---------|-----|
| **Claude Code CLI** (Terminal) | Full | Monitors `~/.claude/` session logs automatically |
| **Claude Code VS Code Extension** | Full | Same JSONL format -- open in VS Code Simple Browser or any browser |
| **Claude Agent SDK** (Python/Node) | Full | Visualizes teams, subagents, and parent-child hierarchies |

Most pixel-art agent monitors only work with terminal sessions. **Pixel Agent Team reads the shared `~/.claude/` session files**, so it works regardless of whether you're using the CLI, the VS Code extension, or the Agent SDK -- all agents show up in the same office.

## What is this?

Pixel Agent Team monitors your local Claude Code sessions and displays each agent as a pixel-art character sitting at a desk in a virtual office. It reads the JSONL event logs that Claude Code generates and visualizes agent activity in real time via WebSocket.

## Features

- **Real-Time Monitoring** -- See agents working as they execute, with live WebSocket updates
- **Pixel-Art Office** -- Retro aesthetic with animated character sprites, desks, and office decorations
- **Agent Hierarchy** -- Visualizes parent-child relationships between main agents and subagents
- **Activity Indicators** -- Color-coded status: gray (idle), blue (typing), amber (tool call), green (messaging)
- **Side Panel** -- Agent details, descriptions, and event log with timestamps
- **Responsive Layout** -- Adjustable desk grid (1-6 columns) with zoom controls (0.3x - 3x)
- **Day/Night Cycle** -- Office ambiance changes over time
- **Auto-Reconnect** -- WebSocket reconnects automatically if connection drops

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Pixi.js, Zustand, Tailwind CSS |
| Backend | Express, WebSocket (ws), Chokidar, Node.js |
| Build | Vite, pnpm workspaces |

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Claude Code** installed and used at least once (so `~/.claude/` exists)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/anirudam/pixel-agent-team.git
cd pixel-agent-team

# Install dependencies
pnpm install

# Start both server and client
pnpm dev
```

The client opens at **http://localhost:5555** and the server runs on **http://localhost:5550**.

Now open Claude Code in another terminal and start working -- you'll see your agents appear in the office!

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start server + client in development mode |
| `pnpm dev:server` | Start only the server (port 5550) |
| `pnpm dev:client` | Start only the client (port 5555) |
| `pnpm build` | Build server + client for production |
| `pnpm build:client` | Build only the client |

## How It Works

```
~/.claude/projects/**/*.jsonl     File Watcher (500ms polling)
~/.claude/teams/**/inboxes/*.json ──────────┐
~/.claude/agents/*.md                       │
                                            ▼
                                    JSONL Parser
                                            │
                                            ▼
                                    State Deriver
                                    (activity tracking)
                                            │
                                            ▼
                                    WebSocket Hub ──► React Client
                                    (broadcast)       (Pixi.js canvas)
```

1. **File Watcher** polls `~/.claude/` for new/modified session logs
2. **JSONL Parser** reads event lines and extracts agent info
3. **State Deriver** determines agent activity (idle, typing, tool_call, messaging)
4. **WebSocket Hub** broadcasts updates to all connected browser clients
5. **React Client** renders the pixel-art office scene with Pixi.js

## Project Structure

```
packages/
├── client/                # React frontend
│   └── src/
│       ├── components/
│       │   ├── office/    # OfficeScene, AgentSprite, MessageBubble
│       │   └── panel/     # SidePanel, AgentCard
│       ├── hooks/         # useWebSocket, useAgentState
│       ├── stores/        # Zustand agent store
│       └── types/         # TypeScript definitions
└── server/                # Express backend
    └── src/
        ├── state/         # Agent registry, state deriver
        ├── watcher/       # File watcher, JSONL parser, session scanner
        └── ws/            # WebSocket hub
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/agents` | List all active agents |
| `GET /api/sessions` | List active sessions |
| `ws://localhost:5550` | WebSocket for real-time updates |

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

[MIT](LICENSE)