#!/usr/bin/env node --experimental-strip-types

import dotenv from "dotenv";
import { join } from "node:path";
import chalk from "chalk";

dotenv.config({ path: join(import.meta.dirname, ".env") });

// Global error handlers — catch unhandled crashes gracefully
process.on("uncaughtException", (err) => {
  console.error(chalk.red("\n💥 Fatal error:"), err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("\n💥 Unhandled rejection:"), reason);
  process.exit(1);
});

import { Command } from "commander";
import { runwakeup } from "./tui/wakeup.ts";
import { runChatMode } from "./modes/chat/index.ts";

const program = new Command();

program
  .name("GanClaw")
  .description("Your personal AI buddy — coding assistant, task runner, and conversational companion")
  .version("1.0.0");

program
  .command("wakeup")
  .description("Launch the interactive TUI and pick a mode")
  .action(async () => {
    await runwakeup();
  });

program
  .command("chat")
  .description("Start a conversation with GanClaw")
  .action(async () => {
    await runChatMode();
  });

await program.parseAsync(process.argv);