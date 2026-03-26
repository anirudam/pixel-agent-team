import { watch, readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const TEAMS_DIR = join(CLAUDE_DIR, "teams");

export class FileWatcher extends EventEmitter {
  private intervals: ReturnType<typeof setInterval>[] = [];
  private fileMtimes = new Map<string, number>();

  start(): void {
    console.log("[FileWatcher] Starting poll-based watcher");
    console.log("[FileWatcher] Watching:", PROJECTS_DIR);

    // Poll every 500ms for changes
    const interval = setInterval(() => {
      this.scanForChanges();
    }, 500);

    this.intervals.push(interval);

    // Initial scan
    this.scanForChanges();
  }

  private scanForChanges(): void {
    // Scan all project directories for .jsonl files
    if (existsSync(PROJECTS_DIR)) {
      this.scanDir(PROJECTS_DIR);
    }

    // Scan team inboxes
    if (existsSync(TEAMS_DIR)) {
      this.scanDir(TEAMS_DIR);
    }
  }

  private scanDir(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          this.scanDir(fullPath);
        } else if (
          entry.name.endsWith(".jsonl") ||
          (entry.name.endsWith(".json") && dir.includes("inboxes"))
        ) {
          try {
            const stat = statSync(fullPath);
            const mtime = stat.mtimeMs;
            const prevMtime = this.fileMtimes.get(fullPath);

            if (prevMtime === undefined || mtime > prevMtime) {
              // Only emit for recently modified files (last 5 minutes)
              const fiveMinAgo = Date.now() - 5 * 60 * 1000;
              if (mtime > fiveMinAgo) {
                if (prevMtime !== undefined) {
                  console.log("[FileWatcher] Changed:", fullPath);
                }
                this.fileMtimes.set(fullPath, mtime);
                this.emit("file_changed", fullPath);
              } else {
                this.fileMtimes.set(fullPath, mtime);
              }
            }
          } catch {
            // File might have been deleted
          }
        }
      }
    } catch {
      // Directory might not exist
    }
  }

  stop(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
  }
}
