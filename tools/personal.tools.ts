import { tool } from "ai";
import { z } from "zod";
import type { ToolExecutor } from "../modes/agent/tool.executor.ts";

export function createPersonalTools(executor: ToolExecutor) {
  return {
    get_current_time: tool({
      description: "Get current system date, time, timestamp, and timezone.",
      inputSchema: z.object({}),
      execute: () => executor.getCurrentTime(),
    }),

    send_email: tool({
      description:
        "Send an email to a recipient via SMTP (requires EMAIL_USER and EMAIL_PASS in .env).",
      inputSchema: z.object({
        to: z.string().email().describe("Recipient email address"),
        subject: z.string().describe("Subject line of the email"),
        body: z.string().describe("Body content of the email"),
      }),
      execute: async ({ to, subject, body }) =>
        executor.sendEmail(to, subject, body),
    }),

    check_emails: tool({
      description:
        "Fetch recent emails from INBOX via IMAP (requires EMAIL_USER and EMAIL_PASS in .env).",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe("Number of recent emails to fetch"),
      }),
      execute: async ({ limit }) => executor.checkEmails(limit),
    }),

    manage_notes: tool({
      description:
        "Read, write, or append personal notes and reminders in notes.md.",
      inputSchema: z.object({
        action: z
          .enum(["read", "write", "append"])
          .describe("Action to perform on notes.md"),
        title: z
          .string()
          .optional()
          .describe("Section title when writing or appending"),
        content: z
          .string()
          .optional()
          .describe("Text content when writing or appending"),
      }),
      execute: async ({ action, title, content }) =>
        executor.manageNotes(action, content, title),
    }),
  };
}
