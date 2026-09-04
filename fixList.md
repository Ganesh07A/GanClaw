# GanClaw — Bug Fix List (Priority Ordered)

> Generated from codebase audit on 2026-08-02
> Fixes are ordered P1 → P4 (Critical → Code Quality)

---

## 🔴 P1 — Critical Bugs (Fix Immediately)

---

### [FIX-01] CLI `plan` case never runs Plan Mode

**File**: `modes/cli.ts` — Line 25-27  
**Symptom**: Selecting "Plan" in the CLI menu prints a log message and loops back — Plan Mode never launches.

**Root Cause**:
```typescript
case "plan":
    console.log(chalk.green("Plan mode selected"))  // just logs, does nothing
    break
```

**Steps to Fix**:
1. Open `modes/cli.ts`.
2. Add the import for `runPlanMode` at the top (it's already imported — just verify line 5).
3. Replace the `case "plan"` block:
```typescript
case "plan":
    await runPlanMode();
    break;
```

---

### [FIX-02] CLI `back` option launches Plan Mode instead of returning

**File**: `modes/cli.ts` — Line 34-36  
**Symptom**: Pressing "Back" in the CLI sub-menu launches Plan Mode instead of going back to the main `wakeup` screen.

**Root Cause**:
```typescript
case "back":
    await runPlanMode()  // WRONG: should just return
    return
```

**Steps to Fix**:
1. Open `modes/cli.ts`.
2. Replace the `case "back"` block:
```typescript
case "back":
    return;  // exits runCli(), returns to wakeup() caller
```

---

### [FIX-03] Plan Orchestrator exits after the first step only

**File**: `modes/plan/orchestrator.ts` — Line 72-77  
**Symptom**: In a multi-step plan, only Step 1 ever runs. All remaining steps are silently skipped.

**Root Cause**:
```typescript
for (const step of selected) {
    ...
    if (responseText.trim()) {
        console.log(renderTerminalMarkdown(responseText));
        return;   // ← exits the entire function after step 1
    }
}
```

**Steps to Fix**:
1. Open `modes/plan/orchestrator.ts`.
2. Remove the `return` inside the loop. Just render the markdown and `continue` to the next step:
```typescript
for (const step of selected) {
    console.log(chalk.bold(`\n🔧 ${step.title}\n`));
    const agent = new ToolLoopAgent({ ... });
    const result = await agent.stream({ prompt: stepPrompt(plan.goal, step) });
    let responseText = "";
    for await (const chunk of result.textStream) {
        responseText += chunk;
        process.stdout.write(chunk);
    }
    console.log("\n");
    if (responseText.trim()) {
        console.log(chalk.dim("========================================"));
        console.log(renderTerminalMarkdown(responseText));
        console.log(chalk.dim("========================================"));
        // ← no return here, continue to the next step
    }
}
// approval flow runs after ALL steps complete
const ok = await runApprovalFlow(tracker);
```

---

### [FIX-04] Telegram `/ask` sends 3 duplicate loading messages

**File**: `modes/telegram/handlers.ts` — Lines 27-29  
**Symptom**: When a user sends `/ask`, 3 separate messages appear in the Telegram chat: "⏳ Processing Your Request…", "🔍 Researching your question…", and another "🔍 Researching your question…" from `generateTelegram`.

**Root Cause**:
```typescript
const loadingMsg = await ctx.reply("⏳ Processing Your Request…")  // msg 1 — stored but never used
await ctx.reply("🔍 Researching your question…");                  // msg 2 — duplicate
void runAsk(ctx, q).catch(console.error);
// generateTelegram() sends msg 3 internally
```

**Steps to Fix**:
1. Open `modes/telegram/handlers.ts`.
2. Remove both `ctx.reply` calls from the `/ask` handler — `generateTelegram` already sends the initial loading message internally via its `initialMessage` parameter:
```typescript
bot.command("ask", async (ctx) => {
    if (!isOwner(ctx.chat.id)) return;
    const q = commandArg(ctx.message.text, "ask");
    if (!q)
        return ctx.reply("Usage: `/ask <your question>`", { parse_mode: "Markdown" });

    void runAsk(ctx, q).catch(console.error);  // generateTelegram handles loading msg
});
```

---

## 🟠 P2 — Medium Bugs (Fix This Sprint)

---

### [FIX-05] IMAP connection leaks if `getMailboxLock` throws

**File**: `modes/agent/tool.executer.ts` — Lines 508-528  
**Symptom**: If connecting to IMAP succeeds but locking the INBOX fails, the connection stays open and never closes.

**Root Cause**:
```typescript
await client.connect();
const lock = await client.getMailboxLock("INBOX");  // if this throws, client hangs open
```

**Steps to Fix**:
1. Open `modes/agent/tool.executer.ts`.
2. Wrap the entire IMAP operation in an outer `try/finally`:
```typescript
await client.connect();
try {
    const lock = await client.getMailboxLock("INBOX");
    try {
        // ... fetch emails
    } finally {
        lock.release();
    }
} finally {
    await client.logout();  // always disconnect
}
```

---

### [FIX-06] Telegram `/ask` command cannot use personal tools (`get_current_time`, `check_emails`, etc.)

**File**: `modes/telegram/agent-run.ts` — Lines 70-80  
**Symptom**: Asking `/ask what time is it?` or `/ask check my emails` in Telegram doesn't use the personal assistant tools — only the read-only code tools are available.

**Root Cause**: `runAsk` uses a local `createReadOnlyTools()` function that doesn't include the new personal tools, while `runAgent` uses `createAgentTools()` which does.

**Steps to Fix**:
1. Open `modes/telegram/agent-run.ts`.
2. Import and add personal tools to the `runAsk` tool set:
```typescript
export async function runAsk(ctx: any, question: string) {
    const config = readOnlyConfig();
    const tracker = new ActionTracker();
    const executor = new ToolExecutor(config, tracker);
    const tools = {
        ...createReadOnlyTools(executor),
        ...extraWebTools(tracker),
        get_current_time: tool({
            description: "Get current system date, time, and timezone.",
            inputSchema: z.object({}),
            execute: async () => executor.getCurrentTime(),
        }),
        check_emails: tool({
            description: "Fetch recent emails from INBOX.",
            inputSchema: z.object({ limit: z.number().int().min(1).max(20).optional().default(5) }),
            execute: async ({ limit }) => executor.checkEmails(limit),
        }),
    };
    ...
}
```
Alternatively, move personal tools into a separate `createPersonalTools(executor)` factory and reuse it everywhere.

---

### [FIX-07] `ask/orchestrator.ts` uses Firecrawl without checking for API key

**File**: `modes/ask/orchestrator.ts` — Line 104  
**Symptom**: If `FIRECRAWL_API_KEY` is not set, the web tools are still added to the agent. When the AI tries to call `web_search`, Firecrawl throws a runtime error.

**Root Cause**:
```typescript
const tools = {
    ...createAskTools(executer),
    ...createWebTools(traker)    // always included, no key guard
}
```

**Steps to Fix**:
1. Open `modes/ask/orchestrator.ts`.
2. Add the same guard used in `agent-run.ts`:
```typescript
const tools = {
    ...createAskTools(executer),
    ...(process.env.FIRECRAWL_API_KEY ? createWebTools(traker) : {}),
}
```

---

### [FIX-08] `plan/orchestrator.ts` uses Firecrawl without checking for API key

**File**: `modes/plan/orchestrator.ts` — Line 51  
**Symptom**: Same as FIX-07, but in the Plan execution loop.

**Root Cause**:
```typescript
const tools = {
    ...createAgentTools(executer),
    ...createWebTools(tracker),   // always included
}
```

**Steps to Fix**:
1. Open `modes/plan/orchestrator.ts`.
2. Guard the web tools:
```typescript
const tools = {
    ...createAgentTools(executer),
    ...(process.env.FIRECRAWL_API_KEY ? createWebTools(tracker) : {}),
}
```

---

### [FIX-09] Telegram approval errors not reported to the user

**File**: `modes/telegram/handlers.ts` — Line 136  
**Symptom**: When file writes fail during approval (e.g. disk full, permission error), the user sees `✅ All changes applied.` even though changes failed.

**Root Cause**:
```typescript
if (errors.length) console.error(errors);  // only logged server-side
```

**Steps to Fix**:
1. Open `modes/telegram/handlers.ts`.
2. After `applyApprovedFromTracker`, check for errors and send them to the user:
```typescript
const { errors } = s.executor.applyApprovedFromTracker();
s.executor.clearStaging();

if (errors.length) {
    await ctx.editMessageText(`⚠️ Applied with errors:\n\n${errors.join("\n")}`);
} else {
    await ctx.editMessageText("✅ All changes applied.");
}
await ctx.answerCbQuery(errors.length ? "Done (with errors)" : "Applied!");
```

---

### [FIX-10] Telegram bot crashes silently if env vars are missing

**File**: `modes/telegram/index.ts` — Lines 8-14  
**Symptom**: If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_OWNER_ID` is missing from `.env`, the bot crashes with an unhelpful deep error inside Telegraf.

**Root Cause**:
```typescript
const bot = new Telegraf(token!)     // token could be undefined
await bot.telegram.sendMessage(ownerId!, ...)  // ownerId could be undefined
```

**Steps to Fix**:
1. Open `modes/telegram/index.ts`.
2. Add early validation before creating the bot:
```typescript
export async function runTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const ownerId = process.env.TELEGRAM_OWNER_ID;

    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
    if (!ownerId) throw new Error("Missing TELEGRAM_OWNER_ID in .env");

    const bot = new Telegraf(token);
    ...
}
```

---

## 🟡 P3 — Edge Cases (Fix Next Sprint)

---

### [FIX-11] `notes.md` is stored in workspace root (pollutes git, visible to agent)

**File**: `modes/agent/tool.executer.ts` — Line 535  
**Symptom**: Personal notes end up in the project root, appear in `git status`, and can be read/modified by the coding agent.

**Steps to Fix**:
1. Change the notes file path to the user's home directory:
```typescript
import { homedir } from "node:os";
...
manageNotes(...) {
    const notesDir = path.join(homedir(), ".ganclaw");
    if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
    const notesFile = path.join(notesDir, "notes.md");
    ...
}
```

---

### [FIX-12] Telegram command args break in group chats (bot username suffix not stripped)

**File**: `modes/telegram/text.ts` — Lines 8-9  
**Symptom**: In a Telegram group, commands are sent as `/ask@YourBotName question`. The current regex doesn't strip `@YourBotName`, so the question text becomes `@YourBotName question`.

**Steps to Fix**:
1. Open `modes/telegram/text.ts`.
2. Update the `commandArg` regex to also strip the optional `@botname` part:
```typescript
export function commandArg(fullText: string, name: string): string {
    return fullText.replace(new RegExp(`^/${name}(?:@\\S+)?\\s*`, 'i'), '').trim();
}
```

---

### [FIX-13] `getEffectiveText` doesn't catch path-escape errors from `resolveSafe`

**File**: `modes/agent/tool.executer.ts` — Lines 87-94  
**Symptom**: If called with a path-escaping relative path, `resolveSafe` throws an uncaught exception instead of returning `undefined`.

**Steps to Fix**:
1. Wrap the body of `getEffectiveText` in a try/catch:
```typescript
getEffectiveText(rel: string): string | undefined {
    try {
        const key = this.norm(rel);
        if (this.deleted.has(key)) return undefined;
        if (this.overlay.has(key)) return this.overlay.get(key);
        const abs = this.resolveSafe(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return undefined;
        return fs.readFileSync(abs, "utf8");
    } catch {
        return undefined;
    }
}
```

---

### [FIX-14] `excluded()` only handles two hardcoded wildcards — custom patterns silently ignored

**File**: `modes/agent/tool.executer.ts` — Lines 67-73  
**Symptom**: Adding a custom wildcard pattern (e.g. `"*.tmp"`) to `excludePatterns` in the config does nothing.

**Steps to Fix**:
1. Replace the hardcoded wildcard checks with a proper `minimatch`-style matcher, or at minimum, implement a simple wildcard-to-regex converter:
```typescript
private matchesWildcard(base: string, pat: string): boolean {
    const regex = new RegExp(
        "^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
        "i"
    );
    return regex.test(base);
}

// In excluded():
for (const pat of this.config.excludePatterns) {
    if (pat.includes("*")) {
        if (this.matchesWildcard(base, pat)) return true;
        continue;
    }
    if (segments.includes(pat) || norm === pat || norm.startsWith(`${pat}/`)) return true;
}
```

---

### [FIX-15] `readFile` has redundant double `statSync` call

**File**: `modes/agent/tool.executer.ts` — Lines 99-105  
**Symptom**: `fs.statSync` is called twice for every file read — once to check existence, once for size. Slightly wasteful.

**Steps to Fix**:
```typescript
readFile(rel: string): string {
    this.assertNotExcluded(rel, "read_file");
    const abs = this.resolveSafe(rel);
    let st: fs.Stats;
    try {
        st = fs.statSync(abs);
    } catch {
        throw new Error(`File not found: ${rel}`);
    }
    if (!st.isFile()) throw new Error(`Not a file: ${rel}`);
    if (st.size > this.config.maxFileSizeToRead) throw new Error(`File too large: ${rel}`);
    ...
}
```

---

## 🔵 P4 — Code Quality (Fix When Convenient)

---

### [FIX-16] Typos in method names (misleading, breaks IDE autocomplete)

**Files**: Multiple  
**Steps to Fix** — rename each:

| File | Current (Typo) | Fix To |
| :--- | :--- | :--- |
| `modes/agent/action.tracker.ts:39` | `updateStaus` | `updateStatus` |
| `modes/agent/action.tracker.ts:33` | `getPendingMutataions` | `getPendingMutations` |
| `modes/plan/planner.ts:17` | `reserachSummary` | `researchSummary` |
| `modes/plan/types.ts:13` | `reserachSummary` | `researchSummary` |
| `modes/plan/planner.ts:123` | `Reseraching` | `Researching` |
| `modes/plan/planner.ts:92` | `PLAN_INTERUCTIONS` | `PLAN_INSTRUCTIONS` |
| `modes/ask/orchestrator.ts:97` | `traker` | `tracker` |
| `modes/agent/tool.executer.ts:19` | `isProbabyTextfile` | `isProbablyTextFile` |

> ⚠️ When renaming `updateStaus` and `getPendingMutataions`, make sure to update every call site (`approval.ts`, `approval-session.ts`, `handlers.ts`).

---

### [FIX-17] Duplicate read-only tool definitions in 4 separate files (DRY violation)

**Files**: `modes/ask/orchestrator.ts`, `modes/plan/planner.ts`, `modes/telegram/agent-run.ts`, `modes/agent/agent.tools.ts`  
**Symptom**: `read_file`, `list_files`, `search_files`, `analyze_codebase` are defined 3+ times nearly identically.

**Steps to Fix**:
1. In `modes/agent/agent.tools.ts`, export a dedicated function:
```typescript
export function createReadOnlyTools(executor: ToolExecutor) {
    return {
        read_file: ...,
        list_files: ...,
        search_files: ...,
        analyze_codebase: ...,
        list_skills: ...,
        read_skill: ...,
    };
}
```
2. Replace all three local `createAskTools` / `readOnlyTools` / `createReadOnlyTools` definitions in other files with an import of this shared function.

---

### [FIX-18] Unused import in `plan/types.ts`

**File**: `modes/plan/types.ts` — Line 1  
**Steps to Fix**:
```diff
-import { UUID } from "crypto";
```
Simply remove the unused import.

---

### [FIX-19] `get_current_time` tool execute function is unnecessarily `async`

**File**: `modes/agent/agent.tools.ts`  
**Steps to Fix**:
```diff
-execute: async () => executor.getCurrentTime(),
+execute: () => executor.getCurrentTime(),
```

---

## Checklist

- [x] FIX-01 — CLI `plan` case runs Plan Mode
- [x] FIX-02 — CLI `back` returns correctly
- [x] FIX-03 — Plan loop doesn't exit after step 1
- [x] FIX-04 — Remove duplicate loading messages in `/ask`
- [x] FIX-05 — IMAP connection wrapped in try/finally
- [x] FIX-06 — Personal tools available in Telegram `/ask`
- [x] FIX-07 — Firecrawl guarded in `ask/orchestrator.ts`
- [x] FIX-08 — Firecrawl guarded in `plan/orchestrator.ts`
- [x] FIX-09 — Approval errors sent to Telegram user
- [x] FIX-10 — Env var validation in `telegram/index.ts`
- [x] FIX-11 — Notes stored in `~/.ganclaw/` not workspace root
- [x] FIX-12 — Command arg parsing handles `@botname` suffix
- [x] FIX-13 — `getEffectiveText` catches path errors
- [x] FIX-14 — `excluded()` handles custom wildcards properly
- [x] FIX-15 — Reduce double `statSync` in `readFile`
- [x] FIX-16 — Fix all typos in method/variable names
- [x] FIX-17 — Consolidate duplicate read-only tool definitions
- [x] FIX-18 — Remove unused `UUID` import in `plan/types.ts`
- [x] FIX-19 — Remove unnecessary `async` from `get_current_time`
