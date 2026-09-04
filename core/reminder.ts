import { randomUUID } from "node:crypto";
import type { Reminder } from "../modes/agent/types.ts";
import { EncryptedStore } from "../storage/store.ts";

export class ReminderManager {
  private store: EncryptedStore<Reminder[]>;
  private cache: Reminder[] | null = null;

  constructor() {
    // Encrypted file stored at ~/.ganclaw/reminders.enc
    this.store = new EncryptedStore<Reminder[]>("reminders.enc");
  }

  /** Load reminders from encrypted disk (with in-memory cache) */
  private getAll(): Reminder[] {
    if (this.cache) return this.cache;
    this.cache = this.store.read() ?? [];
    return this.cache;
  }

  /** Save current cache to disk */
  private save(): void {
    this.store.write(this.cache ?? []);
  }

  /**
   * Add a new reminder
   * @param message What to remind
   * @param minutesFromNow Optional minutes offset (e.g. 15 for 15 mins later)
   * @param dueAtIso Optional exact ISO date string (e.g. "2026-09-05T10:00:00.000Z")
   */
  add(message: string, minutesFromNow?: number, dueAtIso?: string): Reminder {
    const list = this.getAll();

    let targetTime: Date;
    if (minutesFromNow && minutesFromNow > 0) {
      targetTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    } else if (dueAtIso) {
      targetTime = new Date(dueAtIso);
    } else {
      // Default to 1 hour if nothing specified
      targetTime = new Date(Date.now() + 60 * 60 * 1000);
    }

    const reminder: Reminder = {
      id: randomUUID().slice(0, 8), // short 8-char ID
      message: message.trim(),
      dueAt: targetTime.toISOString(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    list.push(reminder);
    this.save();
    return reminder;
  }

  /** List active/pending reminders */
  list(includeDismissed = false): Reminder[] {
    const list = this.getAll();
    if (includeDismissed) return list;
    return list.filter((r) => r.status === "pending");
  }

  /** Dismiss or complete a reminder by ID or matching message snippet */
  dismiss(idOrSnippet: string): boolean {
    const list = this.getAll();
    const query = idOrSnippet.toLowerCase().trim();

    const target = list.find(
      (r) =>
        r.id.toLowerCase() === query ||
        r.message.toLowerCase().includes(query),
    );

    if (target) {
      target.status = "dismissed";
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Check for reminders that are due right now.
   * Returns triggered reminders and updates their status to 'triggered'.
   */
  checkDue(): Reminder[] {
    const list = this.getAll();
    const now = new Date();
    const dueReminders: Reminder[] = [];

    for (const r of list) {
      if (r.status === "pending" && new Date(r.dueAt) <= now) {
        r.status = "triggered";
        dueReminders.push(r);
      }
    }

    if (dueReminders.length > 0) {
      this.save();
    }

    return dueReminders;
  }
}