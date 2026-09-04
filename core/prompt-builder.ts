import type { MemoryManager } from "./memory.ts";
import type { ProfileManager } from "./profile.ts";

/**
 * Builds a dynamic system prompt that injects:
 * - Agent personality
 * - User profile (name, preferences, timezone)
 * - Known facts from memory
 * - Recent conversation context
 * - Current date/time
 */
export function buildSystemPrompt(
  profile: ProfileManager,
  memory: MemoryManager,
  context?: {
    mode?: string;
    workspacePath?: string;
    extraInstructions?: string[];
  },
): string {
  const p = profile.get();
  const facts = memory.getFacts();
  const recentHistory = memory.getRecentHistory(8);
  const now = new Date();

  const sections: string[] = [];

  // ─── Identity ──────────────────────────────────────────────
  sections.push(
    `You are GanClaw, ${p.name ? `${p.name}'s` : "a developer's"} personal AI buddy and coding assistant.`,
    `You are friendly, direct, and slightly witty. You talk like a knowledgeable friend, not a corporate chatbot.`,
    `You remember past conversations and learn about your user over time.`,
  );

  // ─── Current context ──────────────────────────────────────
  sections.push("");
  sections.push(`## Current Context`);
  sections.push(
    `Date/Time: ${now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString("en-IN")}`,
  );
  if (p.timezone) sections.push(`Timezone: ${p.timezone}`);
  if (context?.workspacePath)
    sections.push(`Workspace: ${context.workspacePath}`);
  if (context?.mode) sections.push(`Current mode: ${context.mode}`);

  // ─── User profile ─────────────────────────────────────────
  const profileSummary = profile.summarize();
  if (profileSummary) {
    sections.push("");
    sections.push("## What you know about the user");
    sections.push(profileSummary);
  }

  // ─── Knowledge facts ──────────────────────────────────────
  if (facts.length > 0) {
    sections.push("");
    sections.push("## Remembered facts");
    for (const f of facts.slice(-20)) {
      sections.push(`- ${f.fact}`);
    }
  }

  // ─── Recent conversation ──────────────────────────────────
  if (recentHistory.length > 0) {
    sections.push("");
    sections.push("## Recent conversation (for context)");
    for (const msg of recentHistory) {
      const preview =
        msg.content.length > 200
          ? msg.content.slice(0, 200) + "..."
          : msg.content;
      sections.push(`${msg.role === "user" ? "User" : "You"}: ${preview}`);
    }
  }

  // ─── Behavioral rules ─────────────────────────────────────
  sections.push("");
  sections.push("## Rules");
  sections.push(
    "- Be conversational and natural. Use casual language when appropriate.",
  );
  sections.push(
    "- If the user tells you something about themselves (name, preference, etc.), use the `remember_fact` tool to store it.",
  );
  sections.push(
    "- If you need to recall past context, use the `recall` tool.",
  );
  sections.push(
    "- Keep responses concise unless the user asks for detail.",
  );
  if (p.preferences.responseStyle === "casual") {
    sections.push("- The user prefers a casual tone. Be relaxed and friendly.");
  }
  if (p.preferences.responseStyle === "concise") {
    sections.push("- The user prefers short, to-the-point responses.");
  }

  // ─── Extra instructions (mode-specific) ───────────────────
  if (context?.extraInstructions?.length) {
    sections.push("");
    sections.push("## Additional instructions");
    for (const instr of context.extraInstructions) {
      sections.push(`- ${instr}`);
    }
  }

  return sections.join("\n");
}
