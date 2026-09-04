import { MemoryManager } from "./memory.ts";
import { ProfileManager } from "./profile.ts";
import { ReminderManager } from "./reminder.ts";
import { TaskManager } from "./tasks.ts";
import { ActionTracker } from "../modes/agent/action.tracker.ts";
import { ToolExecutor } from "../modes/agent/tool.executor.ts";
import { defaultAgentConfig, type AgentConfig } from "../modes/agent/types.ts";

// ─── Session ─────────────────────────────────────────────────────────

/**
 * Session — shared state container for a single GanClaw invocation.
 *
 * Instead of each mode creating its own tracker/executor/config independently,
 * Session provides a single source of truth + injects memory/profile/reminder/task context.
 */
export class Session {
  readonly config: AgentConfig;
  readonly tracker: ActionTracker;
  readonly executor: ToolExecutor;
  readonly memory: MemoryManager;
  readonly profile: ProfileManager;
  readonly reminders: ReminderManager;
  readonly tasks: TaskManager;
  readonly mode: string;

  constructor(
    mode: string,
    configOverrides?: Partial<AgentConfig["tools"]>,
  ) {
    this.mode = mode;
    this.memory = getSharedMemory();
    this.profile = getSharedProfile();
    this.reminders = getSharedReminders();
    this.tasks = getSharedTasks();
    this.config = defaultAgentConfig();

    if (configOverrides) {
      Object.assign(this.config.tools, configOverrides);
    }

    this.tracker = new ActionTracker();
    this.executor = new ToolExecutor(this.config, this.tracker);

    // Record the interaction
    this.profile.recordInteraction();
  }
}

// ─── Singletons ──────────────────────────────────────────────────────

// Singletons within a process — shared across modes
let _memory: MemoryManager | null = null;
let _profile: ProfileManager | null = null;
let _reminders: ReminderManager | null = null;
let _tasks: TaskManager | null = null;

export function getSharedMemory(): MemoryManager {
  if (!_memory) _memory = new MemoryManager();
  return _memory;
}

export function getSharedProfile(): ProfileManager {
  if (!_profile) _profile = new ProfileManager();
  return _profile;
}

export function getSharedReminders(): ReminderManager {
  if (!_reminders) _reminders = new ReminderManager();
  return _reminders;
}

export function getSharedTasks(): TaskManager {
  if (!_tasks) _tasks = new TaskManager();
  return _tasks;
}
