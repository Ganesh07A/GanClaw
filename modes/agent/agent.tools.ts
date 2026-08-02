import { tool } from "ai";
import { z } from "zod";
import type { ToolExecutor } from "./tool.executer.ts";

export function createReadOnlyTools(executor: ToolExecutor) {
  return {
    read_file: tool({
      description:
        "Read a text file from the workspace. Use a path relative to the project root.",
      inputSchema: z.object({
        path: z.string().describe("Relative file path"),
      }),
      execute: async ({ path: p }) => executor.readFile(p),
    }),

    list_files: tool({
      description: "List files and directories under a path.",
      inputSchema: z.object({
        path: z.string(),
        recursive: z.boolean().optional().default(false),
      }),
      execute: async ({ path: p, recursive }) =>
        executor.listFiles(p, recursive),
    }),

    search_files: tool({
      description:
        'Find files matching a glob pattern (e.g. "*.ts", "**/*.md"). Optional content substring filter.',
      inputSchema: z.object({
        root: z.string().describe("Directory to search, relative to root"),
        pattern: z
          .string()
          .describe("Glob-like pattern using * and ** (forward slashes)"),
        content_contains: z.string().optional(),
      }),
      execute: async ({ root, pattern, content_contains }) =>
        executor.searchFiles(root, pattern, content_contains),
    }),

    analyze_codebase: tool({
      description:
        "Summarize structure: file counts, size, extensions. Read-only.",
      inputSchema: z.object({
        path: z.string().default("."),
      }),
      execute: async ({ path: p }) => executor.analyzeCodebase(p),
    }),

    list_skills: tool({
      description:
        "List absolute paths to SKILL.md files under configured skill directories (Cursor / Claude).",
      inputSchema: z.object({}),
      execute: async () => executor.listSkills(),
    }),

    read_skill: tool({
      description:
        "Read a SKILL.md file. Path must be absolute and under skill roots, or use a path returned by list_skills.",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path: p }) => executor.readSkill(p),
    }),
  };
}

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

export function createAgentTools(executor: ToolExecutor) {
  return {
    ...createReadOnlyTools(executor),
    ...createPersonalTools(executor),

    create_file: tool({
      description:
        "Stage creation of a new file (not written until the user approves).",
      inputSchema: z.object({
        path: z.string(),
        content: z.string(),
      }),
      execute: async ({ path: p, content }) => executor.createFile(p, content),
    }),

    modify_file: tool({
      description:
        "Stage a full-file replacement for an existing file (pending approval).",
      inputSchema: z.object({
        path: z.string(),
        content: z.string().describe("Complete new file contents"),
      }),
      execute: async ({ path: p, content }) => executor.modifyFile(p, content),
    }),

    delete_file: tool({
      description: "Stage deletion of a file (pending approval).",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path: p }) => executor.deleteFile(p),
    }),

    create_folder: tool({
      description:
        "Stage creation of a directory tree (pending approval). Uses mkdir -p on apply.",
      inputSchema: z.object({
        path: z.string().describe("Relative directory path"),
      }),
      execute: async ({ path: p }) => executor.createFolder(p),
    }),

    execute_shell: tool({
      description:
        "Queue a shell command to run in the workspace after user approval. Use with care.",
      inputSchema: z.object({
        command: z.string().describe("Single command; runs with shell: true"),
      }),
      execute: async ({ command }) => executor.queueShell(command),
    }),
  };
}