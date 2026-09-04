import { EncryptedStore } from "../storage/store.ts";

// ─── Types ───────────────────────────────────────────────────────────

export interface UserProfile {
  name?: string;
  timezone?: string;
  preferences: {
    language?: string;
    framework?: string;
    responseStyle?: "concise" | "detailed" | "casual";
    codeStyle?: string;
  };
  context: {
    currentProjects: string[];
    recentTopics: string[];
  };
  stats: {
    firstSeen: string;
    totalInteractions: number;
    lastActiveAt: string;
  };
}

const DEFAULT_PROFILE: UserProfile = {
  preferences: {},
  context: {
    currentProjects: [],
    recentTopics: [],
  },
  stats: {
    firstSeen: new Date().toISOString(),
    totalInteractions: 0,
    lastActiveAt: new Date().toISOString(),
  },
};

// ─── ProfileManager ──────────────────────────────────────────────────

/**
 * Manages the user's profile — preferences, context, and stats.
 * Stored encrypted in ~/.ganclaw/profile.enc
 */
export class ProfileManager {
  private store: EncryptedStore<UserProfile>;
  private cache: UserProfile | null = null;

  constructor() {
    this.store = new EncryptedStore<UserProfile>("profile.enc");
  }

  /** Get the current profile, creating a default if none exists. */
  get(): UserProfile {
    if (this.cache) return this.cache;
    this.cache = this.store.read() ?? { ...DEFAULT_PROFILE };
    return this.cache;
  }

  /** Update specific fields in the profile. */
  update(partial: Partial<UserProfile>): UserProfile {
    const current = this.get();
    const merged = deepMerge(current, partial) as UserProfile;
    this.cache = merged;
    this.store.write(merged);
    return merged;
  }

  /** Record an interaction — bumps counter and lastActive timestamp. */
  recordInteraction(): void {
    const p = this.get();
    p.stats.totalInteractions++;
    p.stats.lastActiveAt = new Date().toISOString();
    this.store.write(p);
  }

  /** Add a topic to recent topics (keeps last 10). */
  addRecentTopic(topic: string): void {
    const p = this.get();
    p.context.recentTopics = [
      topic,
      ...p.context.recentTopics.filter((t) => t !== topic),
    ].slice(0, 10);
    this.store.write(p);
  }

  /** Get a human-readable summary of the profile for the AI. */
  summarize(): string {
    const p = this.get();
    const lines: string[] = [];

    if (p.name) lines.push(`Name: ${p.name}`);
    if (p.timezone) lines.push(`Timezone: ${p.timezone}`);
    if (p.preferences.language) lines.push(`Preferred language: ${p.preferences.language}`);
    if (p.preferences.framework) lines.push(`Preferred framework: ${p.preferences.framework}`);
    if (p.preferences.responseStyle) lines.push(`Response style: ${p.preferences.responseStyle}`);
    if (p.preferences.codeStyle) lines.push(`Code style: ${p.preferences.codeStyle}`);
    if (p.context.currentProjects.length > 0) {
      lines.push(`Active projects: ${p.context.currentProjects.join(", ")}`);
    }
    if (p.context.recentTopics.length > 0) {
      lines.push(`Recent topics: ${p.context.recentTopics.slice(0, 5).join(", ")}`);
    }
    lines.push(`Interactions so far: ${p.stats.totalInteractions}`);

    return lines.join("\n");
  }
}

// ─── Utils ───────────────────────────────────────────────────────────

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}
