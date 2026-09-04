import { tool } from "ai";
import { z } from "zod";
import type { ReminderManager } from "../core/reminder.ts";

export function createReminderTools(reminders: ReminderManager) {
  return {
    set_reminder: tool({
      description:
        "Set a reminder for the user. Provide either minutes_from_now (e.g. 15 for 15 minutes) or an ISO 8601 date-time string.",
      inputSchema: z.object({
        message: z.string().describe("What to remind the user about"),
        minutes_from_now: z
          .number()
          .optional()
          .describe("Number of minutes from right now to trigger the reminder"),
        due_at_iso: z
          .string()
          .optional()
          .describe("Target ISO 8601 date string if a specific date/time was given"),
      }),
      execute: async ({ message, minutes_from_now, due_at_iso }) => {
        const item = reminders.add(message, minutes_from_now, due_at_iso);
        const dueFormatted = new Date(item.dueAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return `✅ Reminder created: "${item.message}" (ID: ${item.id}, Due: ${dueFormatted})`;
      },
    }),

    list_reminders: tool({
      description: "List all active and pending reminders.",
      inputSchema: z.object({}),
      execute: async () => {
        const list = reminders.list();
        if (list.length === 0) return "You have no active reminders.";
        return list
          .map((r, i) => {
            const dueFormatted = new Date(r.dueAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return `${i + 1}. [${r.id}] "${r.message}" — Due: ${dueFormatted}`;
          })
          .join("\n");
      },
    }),

    dismiss_reminder: tool({
      description: "Dismiss or clear a reminder by its ID or title snippet.",
      inputSchema: z.object({
        id_or_message: z
          .string()
          .describe("Reminder ID or keywords matching the reminder"),
      }),
      execute: async ({ id_or_message }) => {
        const ok = reminders.dismiss(id_or_message);
        return ok
          ? `✅ Dismissed reminder: "${id_or_message}"`
          : `❌ Could not find a pending reminder matching "${id_or_message}"`;
      },
    }),
  };
}
