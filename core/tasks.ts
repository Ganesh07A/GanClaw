import { randomUUID } from "node:crypto";
import type { Task } from "../modes/agent/types.ts";
import { EncryptedStore } from "../storage/store.ts";

export class TaskManager {
  private store: EncryptedStore<Task[]>;
  private cache: Task[] | null = null;

  constructor() {
    this.store = new EncryptedStore<Task[]>("tasks.enc");
  }

  private getAll(): Task[] {
    if (this.cache) return this.cache;
    this.cache = this.store.read() ?? [];
    return this.cache;
  }

  private save(): void {
    this.store.write(this.cache ?? []);
  }

  /** Add a new task */
  add(
    title: string,
    priority: "low" | "medium" | "high" = "medium",
    dueDate?: string,
  ): Task {
    const list = this.getAll();
    const task: Task = {
      id: randomUUID().slice(0, 8),
      title: title.trim(),
      priority,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    list.push(task);
    this.save();
    return task;
  }

  /** List tasks filtered by status */
  list(filter: "all" | "pending" | "completed" = "pending"): Task[] {
    const list = this.getAll();
    if (filter === "all") return list;
    if (filter === "completed") return list.filter((t) => t.completed);
    return list.filter((t) => !t.completed);
  }

  /** Mark a task as completed */
  complete(idOrTitle: string): boolean {
    const list = this.getAll();
    const query = idOrTitle.toLowerCase().trim();
    const target = list.find(
      (t) =>
        t.id.toLowerCase() === query ||
        t.title.toLowerCase().includes(query),
    );
    if (target) {
      target.completed = true;
      this.save();
      return true;
    }
    return false;
  }

  /** Delete a task permanently */
  delete(idOrTitle: string): boolean {
    const list = this.getAll();
    const query = idOrTitle.toLowerCase().trim();
    const idx = list.findIndex(
      (t) =>
        t.id.toLowerCase() === query ||
        t.title.toLowerCase().includes(query),
    );
    if (idx !== -1) {
      list.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }
}
