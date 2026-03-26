import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import matter from "gray-matter";
import type { AgentDefinition } from "./types.js";

const AGENTS_DIR = join(homedir(), ".claude", "agents");

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();

  async load(): Promise<void> {
    try {
      const files = await readdir(AGENTS_DIR);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      for (const file of mdFiles) {
        const filePath = join(AGENTS_DIR, file);
        const content = await readFile(filePath, "utf-8");
        const { data } = matter(content);

        const name = (data.name as string) || file.replace(".md", "");
        const description = (data.description as string) || "";

        this.agents.set(name, { name, description, filePath });
      }

      console.log(
        `[AgentRegistry] Loaded ${this.agents.size} agent definitions`
      );
    } catch (err) {
      console.warn(
        `[AgentRegistry] Could not read agents dir: ${AGENTS_DIR}`,
        err
      );
    }
  }

  getAll(): Map<string, AgentDefinition> {
    return this.agents;
  }

  get(name: string): AgentDefinition | undefined {
    // Exact match first
    const exact = this.agents.get(name);
    if (exact) return exact;

    // Try case-insensitive match
    const nameLower = name.toLowerCase();
    for (const [key, def] of this.agents) {
      if (key.toLowerCase() === nameLower) return def;
    }

    // Try partial match: check if the agent name appears in the given name
    // e.g., agentId "sub:researcher" should match definition "researcher"
    const stripped = name.replace(/^sub:/, "");
    if (stripped !== name) {
      const strippedMatch = this.agents.get(stripped);
      if (strippedMatch) return strippedMatch;
    }

    return undefined;
  }
}
