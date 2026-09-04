import type { Session } from "../core/session.ts";
import { createReadOnlyCodeTools, createMutationCodeTools } from "./code.tools.ts";
import { createPersonalTools } from "./personal.tools.ts";
import { createMemoryTools } from "./memory.tools.ts";
import { createReminderTools } from "./reminder.tools.ts";
import { createTaskTools } from "./task.tools.ts";
import { createWebTools } from "./web.tools.ts";

export type GanClawMode = "chat" | "agent" | "plan" | "ask" | "telegram";

/**
 * Central Tool Registry & Factory.
 * Assembles and returns the appropriate tools based on mode and session context.
 */
export function getTools(session: Session, mode: GanClawMode = "chat") {
  const readOnlyCode = createReadOnlyCodeTools(session.executor);
  const personal = createPersonalTools(session.executor);
  const memory = createMemoryTools(session.memory);
  const reminders = createReminderTools(session.reminders);
  const tasks = createTaskTools(session.tasks);
  const web = process.env.FIRECRAWL_API_KEY
    ? createWebTools(session.tracker)
    : {};

  switch (mode) {
    case "chat":
      // Chat gets conversational, personal, memory, task, reminder, read-only code, and web tools
      return {
        ...readOnlyCode,
        ...personal,
        ...memory,
        ...reminders,
        ...tasks,
        ...web,
      };

    case "agent":
      // Agent mode gets code mutations + read-only + personal + memory + web
      return {
        ...readOnlyCode,
        ...createMutationCodeTools(session.executor),
        ...personal,
        ...memory,
        ...reminders,
        ...tasks,
        ...web,
      };

    case "plan":
      // Plan mode focuses on exploration & research
      return {
        ...readOnlyCode,
        ...memory,
        ...web,
      };

    case "ask":
      // Ask mode gets read-only + personal + memory + web
      return {
        ...readOnlyCode,
        ...personal,
        ...memory,
        ...web,
      };

    case "telegram":
      // Telegram bot gets full buddy suite
      return {
        ...readOnlyCode,
        ...personal,
        ...memory,
        ...reminders,
        ...tasks,
        ...web,
      };

    default:
      return {
        ...readOnlyCode,
        ...personal,
        ...memory,
        ...reminders,
        ...tasks,
        ...web,
      };
  }
}

// Re-export individual tool creators for custom composition if needed
export {
  createReadOnlyCodeTools,
  createMutationCodeTools,
  createPersonalTools,
  createMemoryTools,
  createReminderTools,
  createTaskTools,
  createWebTools,
};
