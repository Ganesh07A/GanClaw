import { tool } from "ai";
import { z } from "zod";
import type { TaskManager } from "../core/tasks.ts";

export function createTaskTools(tasks: TaskManager) {
  return {
    add_task: tool({
      description: "Add a new todo task to the user's personal task list.",
      inputSchema: z.object({
        title: z.string().describe("The task title or description"),
        priority: z
          .enum(["low", "medium", "high"])
          .optional()
          .default("medium")
          .describe("Priority of the task"),
        due_date: z
          .string()
          .optional()
          .describe("Optional due date (e.g. 'tomorrow', 'next Monday', or ISO string)"),
      }),
      execute: async ({ title, priority, due_date }) => {
        const task = tasks.add(title, priority, due_date);
        return `✅ Added task [${task.priority.toUpperCase()}]: "${task.title}" (ID: ${task.id})`;
      },
    }),

    list_tasks: tool({
      description: "List personal tasks/todos. Can filter by pending, completed, or all.",
      inputSchema: z.object({
        filter: z
          .enum(["pending", "completed", "all"])
          .optional()
          .default("pending")
          .describe("Which tasks to list"),
      }),
      execute: async ({ filter }) => {
        const list = tasks.list(filter);
        if (list.length === 0) return `No ${filter} tasks found.`;
        return list
          .map((t, i) => {
            const status = t.completed ? "✓" : "○";
            const due = t.dueDate ? ` (Due: ${t.dueDate})` : "";
            return `${i + 1}. [${status}] [${t.priority.toUpperCase()}] "${t.title}"${due} [ID: ${t.id}]`;
          })
          .join("\n");
      },
    }),

    complete_task: tool({
      description: "Mark a task as completed.",
      inputSchema: z.object({
        id_or_title: z.string().describe("Task ID or title snippet to mark complete"),
      }),
      execute: async ({ id_or_title }) => {
        const ok = tasks.complete(id_or_title);
        return ok
          ? `✅ Completed task: "${id_or_title}"`
          : `❌ Could not find a task matching "${id_or_title}"`;
      },
    }),

    delete_task: tool({
      description: "Delete a task permanently.",
      inputSchema: z.object({
        id_or_title: z.string().describe("Task ID or title snippet to delete"),
      }),
      execute: async ({ id_or_title }) => {
        const ok = tasks.delete(id_or_title);
        return ok
          ? `🗑️ Deleted task: "${id_or_title}"`
          : `❌ Could not find a task matching "${id_or_title}"`;
      },
    }),
  };
}
