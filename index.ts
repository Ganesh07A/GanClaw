#!/usr/bin/env node --experimental-strip-types

import dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(import.meta.dirname, ".env") });


import { Command } from "commander";
import { runwakeup } from "./tui/wakeup.ts";
const program = new Command()

program
    .name('GanClaw')
    .description('CLI to some JavaScript string utilities')
    .version('0.0.1');

program.command("wakeup").description("show bannner and pivk any one tool cli or telegram").action(async () => {
    await runwakeup()
})

await program.parseAsync(process.argv)