import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { EncryptedStore } from "../storage/store.ts";
import { ganclawHome } from "../storage/crypto.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface ConversationEntry {
  id: string;
  timestamp: string;
  role: "user" | "assistant";
  content: string;
  mode: string;
  summary?: string;
}

export interface KnowledgeFact {
  id: string;
  fact: string;
  source: string;
  confidence: number;
  createdAt: string;
  lastUsedAt: string;
}

interface MemoryStoreData {
  facts: KnowledgeFact[];
}

const DEFAULT_MEMORY_STORE: MemoryStoreData = {
  facts: [],
};

// ─── MemoryManager ───────────────────────────────────────────────────

/**
 * Manages conversation history and long-term knowledge facts.
 * - Facts are stored in ~/.ganclaw/memory.enc
 * - Daily conversation history is stored in ~/.ganclaw/conversations/YYYY-MM-DD.enc
 */
export class MemoryManager {
  private factsStore: EncryptedStore<MemoryStoreData>;
  private factsCache: KnowledgeFact[] | null = null;
  private recentMessagesCache: ConversationEntry[] = [];

  constructor() {
    this.factsStore = new EncryptedStore<MemoryStoreData>("memory.enc");
    this.loadRecentMessagesFromDisk();
  }

  // ─── Knowledge Facts ──────────────────────────────────────────────

  /** Get all stored knowledge facts. */
  getFacts(): KnowledgeFact[] {
    if (this.factsCache) return this.factsCache;
    const data = this.factsStore.read() ?? { ...DEFAULT_MEMORY_STORE };
    this.factsCache = data.facts ?? [];
    return this.factsCache;
  }

  /** Add a new fact to memory. */
  addFact(fact: string, source: string = "user_said", confidence: number = 1.0): KnowledgeFact {
    const facts = this.getFacts();

    // Avoid duplicate facts
    const normalized = fact.trim().toLowerCase();
    const existing = facts.find((f) => f.fact.trim().toLowerCase() === normalized);
    if (existing) {
      existing.lastUsedAt = new Date().toISOString();
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      this.saveFacts();
      return existing;
    }

    const newFact: KnowledgeFact = {
      id: randomUUID(),
      fact: fact.trim(),
      source,
      confidence,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    facts.push(newFact);
    this.saveFacts();
    return newFact;
  }

  /** Remove a fact by ID. */
  removeFact(id: string): boolean {
    const facts = this.getFacts();
    const initialLen = facts.length;
    this.factsCache = facts.filter((f) => f.id !== id);
    if (this.factsCache.length !== initialLen) {
      this.saveFacts();
      return true;
    }
    return false;
  }

  /** Save facts cache to encrypted store. */
  private saveFacts(): void {
    this.factsStore.write({
      facts: this.factsCache ?? [],
    });
  }

  // ─── Conversation History ─────────────────────────────────────────

  /** Log a message to memory and persist it to daily store. */
  logMessage(role: "user" | "assistant", content: string, mode: string = "chat"): ConversationEntry {
    const entry: ConversationEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      role,
      content,
      mode,
    };

    this.recentMessagesCache.push(entry);
    if (this.recentMessagesCache.length > 50) {
      this.recentMessagesCache = this.recentMessagesCache.slice(-50);
    }

    // Persist to today's conversation file
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const todayStore = new EncryptedStore<ConversationEntry[]>(`${dateStr}.enc`, "conversations");
    const existing = todayStore.read() ?? [];
    existing.push(entry);
    todayStore.write(existing);

    return entry;
  }

  /** Get recent conversation history (in-memory cache + today's logs). */
  getRecentHistory(limit: number = 10): ConversationEntry[] {
    return this.recentMessagesCache.slice(-limit);
  }

  /** Search across facts and conversation logs. */
  searchMemory(query: string): string {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matchedFacts: string[] = [];
    const matchedConvs: string[] = [];

    // Search facts
    for (const f of this.getFacts()) {
      const lower = f.fact.toLowerCase();
      if (terms.some((t) => lower.includes(t))) {
        matchedFacts.push(`- [Fact] ${f.fact}`);
      }
    }

    // Search recent messages
    for (const msg of this.recentMessagesCache) {
      const lower = msg.content.toLowerCase();
      if (terms.some((t) => lower.includes(t))) {
        const preview = msg.content.length > 150 ? msg.content.slice(0, 150) + "..." : msg.content;
        matchedConvs.push(`- [${msg.role === "user" ? "User" : "Assistant"} (${msg.timestamp.split("T")[0]})]: ${preview}`);
      }
    }

    // Search past files if directory exists
    const convDir = path.join(ganclawHome(), "conversations");
    if (fs.existsSync(convDir)) {
      try {
        const files = fs.readdirSync(convDir).filter((f) => f.endsWith(".enc"));
        for (const file of files.slice(-5)) { // look at last 5 days
          const store = new EncryptedStore<ConversationEntry[]>(file, "conversations");
          const entries = store.read() ?? [];
          for (const entry of entries) {
            const lower = entry.content.toLowerCase();
            if (terms.some((t) => lower.includes(t))) {
              const preview = entry.content.length > 150 ? entry.content.slice(0, 150) + "..." : entry.content;
              const line = `- [${entry.role === "user" ? "User" : "Assistant"} (${entry.timestamp.split("T")[0]})]: ${preview}`;
              if (!matchedConvs.includes(line)) {
                matchedConvs.push(line);
              }
            }
          }
        }
      } catch {
        // Ignore read errors during search
      }
    }

    if (matchedFacts.length === 0 && matchedConvs.length === 0) {
      return `No memories or past conversations found matching "${query}".`;
    }

    const sections: string[] = [];
    if (matchedFacts.length > 0) {
      sections.push("### Relevant Facts:\n" + matchedFacts.join("\n"));
    }
    if (matchedConvs.length > 0) {
      sections.push("### Relevant Past Conversations:\n" + matchedConvs.slice(-10).join("\n"));
    }

    return sections.join("\n\n");
  }

  /** Load recent conversation messages from today's & yesterday's logs into memory cache. */
  private loadRecentMessagesFromDisk(): void {
    const convDir = path.join(ganclawHome(), "conversations");
    if (!fs.existsSync(convDir)) return;

    try {
      const files = fs.readdirSync(convDir)
        .filter((f) => f.endsWith(".enc"))
        .sort(); // lexicographical sort works for YYYY-MM-DD.enc

      const recentFiles = files.slice(-2);
      const all: ConversationEntry[] = [];
      for (const f of recentFiles) {
        const store = new EncryptedStore<ConversationEntry[]>(f, "conversations");
        const items = store.read();
        if (items && Array.isArray(items)) {
          all.push(...items);
        }
      }
      this.recentMessagesCache = all.slice(-50);
    } catch {
      this.recentMessagesCache = [];
    }
  }
}
