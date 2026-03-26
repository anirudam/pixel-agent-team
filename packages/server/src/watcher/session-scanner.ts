import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ActiveSession } from "../state/types.js";

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export class SessionScanner {
  async scanActiveSessions(): Promise<ActiveSession[]> {
    const sessions: ActiveSession[] = [];

    try {
      const projects = await this.readDirSafe(PROJECTS_DIR);

      for (const project of projects) {
        const projectPath = join(PROJECTS_DIR, project);
        const projectStat = await this.statSafe(projectPath);
        if (!projectStat?.isDirectory()) continue;

        // Scan for JSONL files in this project directory
        await this.scanDirectory(projectPath, sessions);
      }
    } catch (err) {
      console.warn("[SessionScanner] Error scanning sessions:", err);
    }

    return sessions;
  }

  private async scanDirectory(
    dirPath: string,
    sessions: ActiveSession[]
  ): Promise<void> {
    const entries = await this.readDirSafe(dirPath);
    const now = Date.now();

    const jsonlFiles: string[] = [];
    const subagentFiles: string[] = [];

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const entryStat = await this.statSafe(entryPath);
      if (!entryStat) continue;

      if (entryStat.isFile() && entry.endsWith(".jsonl")) {
        const modifiedAgo = now - Number(entryStat.mtimeMs);
        if (modifiedAgo < ACTIVE_THRESHOLD_MS) {
          jsonlFiles.push(entryPath);
        }
      }

      if (entryStat.isDirectory() && entry === "subagents") {
        const subFiles = await this.readDirSafe(entryPath);
        for (const sub of subFiles) {
          if (sub.endsWith(".jsonl")) {
            const subPath = join(entryPath, sub);
            const subStat = await this.statSafe(subPath);
            if (subStat && now - Number(subStat.mtimeMs) < ACTIVE_THRESHOLD_MS) {
              subagentFiles.push(subPath);
            }
          }
        }
      }
    }

    for (const sessionFile of jsonlFiles) {
      sessions.push({
        projectPath: dirPath,
        sessionFile,
        lastModified: Date.now(),
        subagentFiles,
      });
    }
  }

  private async readDirSafe(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath);
    } catch {
      return [];
    }
  }

  private async statSafe(
    filePath: string
  ): Promise<Awaited<ReturnType<typeof stat>> | null> {
    try {
      return await stat(filePath);
    } catch {
      return null;
    }
  }
}
