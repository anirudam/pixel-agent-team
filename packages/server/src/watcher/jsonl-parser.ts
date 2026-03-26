import { open, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { EventEmitter } from "node:events";
import { basename, dirname } from "node:path";
import type { AgentEvent } from "../state/types.js";

interface SubagentMeta {
  agentType: string;
  description: string;
}


export class JsonlParser extends EventEmitter {
  private offsets = new Map<string, number>();
  private metaCache = new Map<string, SubagentMeta>();

  /**
   * Read .meta.json for a subagent JSONL file.
   * e.g., agent-abc123.jsonl -> agent-abc123.meta.json
   */
  private async readMeta(jsonlPath: string): Promise<SubagentMeta | null> {
    const cached = this.metaCache.get(jsonlPath);
    if (cached) return cached;

    const metaPath = jsonlPath.replace(/\.jsonl$/, ".meta.json");
    try {
      if (!existsSync(metaPath)) return null;
      const content = await readFile(metaPath, "utf-8");
      const meta = JSON.parse(content) as SubagentMeta;
      this.metaCache.set(jsonlPath, meta);
      return meta;
    } catch {
      return null;
    }
  }

  async parseNewLines(filePath: string): Promise<void> {
    const currentOffset = this.offsets.get(filePath) || 0;

    try {
      const fileHandle = await open(filePath, "r");
      try {
        const stat = await fileHandle.stat();
        if (stat.size <= currentOffset) return;

        const bytesToRead = stat.size - currentOffset;
        const buffer = Buffer.alloc(bytesToRead);
        await fileHandle.read(buffer, 0, bytesToRead, currentOffset);

        this.offsets.set(filePath, stat.size);

        const text = buffer.toString("utf-8");
        const lines = text.split("\n").filter((line) => line.trim().length > 0);

        console.log(`[JsonlParser] Parsing ${lines.length} new lines from ${filePath}`);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const event = await this.toAgentEvent(parsed, filePath);
            if (event) {
              console.log(`[JsonlParser] Event: agent=${event.agentId}, type=${event.contentType}, role=${event.role}`);
              this.emit("event", event);
            }
          } catch {
            // Skip malformed lines
          }
        }
      } finally {
        await fileHandle.close();
      }
    } catch (err) {
      console.warn(`[JsonlParser] Error reading ${filePath}:`, err);
    }
  }

  private async toAgentEvent(
    raw: Record<string, unknown>,
    sourceFile: string
  ): Promise<AgentEvent | null> {
    const isSubagent =
      sourceFile.includes("/subagents/") || sourceFile.includes("\\subagents\\");

    // Derive agentId smartly based on context
    const agentId = await this.deriveAgentId(raw, sourceFile, isSubagent);

    // Determine content type and extract content
    let contentType: AgentEvent["contentType"] = "unknown";
    let content: string | null = null;
    let role: AgentEvent["role"] = "unknown";

    if (raw.role) {
      role = raw.role as AgentEvent["role"];
    }

    // Handle message.content array (Claude API format)
    const message = raw.message as Record<string, unknown> | undefined;
    const contentBlocks = (message?.content || raw.content) as
      | Array<Record<string, unknown>>
      | string
      | undefined;

    if (Array.isArray(contentBlocks)) {
      for (const block of contentBlocks) {
        if (block.type === "tool_use") {
          contentType = "tool_use";
          content = (block.name as string) || "tool_call";
          break;
        }
        if (block.type === "tool_result") {
          contentType = "tool_result";
          content =
            typeof block.content === "string"
              ? (block.content as string).slice(0, 100)
              : "result";
          break;
        }
        if (block.type === "text") {
          contentType = "text";
          content = ((block.text as string) || "").slice(0, 200);
        }
      }
    } else if (typeof contentBlocks === "string") {
      contentType = "text";
      content = contentBlocks.slice(0, 200);
    }

    if (message?.role) {
      role = message.role as AgentEvent["role"];
    }

    // Derive parentId for subagents from sourceFile path
    let parentId: string | null = null;
    if (isSubagent) {
      // sourceFile: ~/.claude/projects/{projectDir}/{sessionId}/subagents/agent-xxx.jsonl
      const parts = sourceFile.replace(/\\/g, "/").split("/");
      const subagentsIdx = parts.lastIndexOf("subagents");
      if (subagentsIdx >= 2) {
        const projectDirName = parts[subagentsIdx - 2]; // the project dir
        const parentSessionId = parts[subagentsIdx - 1]; // the session UUID
        const projectName = this.extractProjectName(projectDirName) || projectDirName;
        parentId = `${projectName}::${parentSessionId}`;
      }
    }

    return {
      type: (raw.type as string) || "message",
      agentId,
      slug: (raw.slug as string) || agentId,
      timestamp: (raw.timestamp as number) || Date.now(),
      content,
      contentType,
      role,
      sourceFile,
      parentId,
    };
  }

  /**
   * Derive a human-readable agentId from JSONL data and file path.
   *
   * For main sessions: use the last segment of `cwd` (e.g., "my-brain")
   * For subagents: use `slug` if available, otherwise the raw agentId prefixed with "sub:"
   */
  private async deriveAgentId(
    raw: Record<string, unknown>,
    sourceFile: string,
    isSubagent: boolean
  ): Promise<string> {
    if (isSubagent) {
      // Try meta.json first for meaningful name
      const meta = await this.readMeta(sourceFile);
      if (meta?.agentType) {
        // Use agentType + short description, e.g. "researcher: Search Pixel Agents"
        const desc = meta.description || "";
        const shortDesc = desc.length > 30 ? desc.slice(0, 29) + "…" : desc;
        return shortDesc ? `${meta.agentType}: ${shortDesc}` : meta.agentType;
      }
      // Fallback: prefer slug, then raw agentId
      const slug = raw.slug as string | undefined;
      if (slug) return slug;
      const rawAgentId = raw.agentId as string | undefined;
      if (rawAgentId) return `sub:${rawAgentId}`;
      return `sub:${basename(sourceFile, ".jsonl")}`;
    }

    // Main session: use projectName + sessionId for uniqueness
    // Path format: ~/.claude/projects/-Users-b2o-...-projectName/sessionId.jsonl
    const sessionId = basename(sourceFile, ".jsonl");
    const projectDir = basename(dirname(sourceFile));
    const projectName = this.extractProjectName(projectDir);

    if (projectName) return `${projectName}::${sessionId}`;

    // Fallback: use cwd last segment + sessionId
    const cwd = raw.cwd as string | undefined;
    if (cwd) {
      const segments = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
      const name = segments[segments.length - 1];
      if (name) return `${name}::${sessionId}`;
    }

    return sessionId;
  }

  /**
   * Extract the last meaningful segment from a hyphen-encoded project directory name.
   * e.g., "-Users-b2o-Mac-B2o-Source-Code-my-brain" -> "my-brain"
   */
  private extractProjectName(dirName: string): string | null {
    // The directory name encodes the full path with hyphens replacing "/"
    // The last segment (after the last known path separator pattern) is the project name
    // Pattern: the project name is the last folder in the original path
    // e.g., "-Users-b2o-Mac-B2o-Source-Code-my-brain"
    // We look for "Source-Code-" or similar patterns, but a more robust approach
    // is to split by common path segments

    // Try to find project name by matching against common prefixes
    const prefixes = [
      /^-Users-.*?-Source-Code-/,
      /^-Users-.*?-Projects-/,
      /^-Users-.*?-repos-/,
      /^-home-.*?-/,
    ];

    for (const prefix of prefixes) {
      const match = dirName.match(prefix);
      if (match) {
        const remainder = dirName.slice(match[0].length);
        if (remainder) return remainder;
      }
    }

    // Fallback: just return the last hyphen-separated segment (crude but better than the full thing)
    // But this could be wrong for multi-word project names, so only use as last resort
    return null;
  }

  resetOffset(filePath: string): void {
    this.offsets.delete(filePath);
  }
}
