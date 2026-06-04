#!/usr/bin/env node --experimental-strip-types

import { Command } from "commander";
import figlet from 'figlet'

const program = new Command()

program
    .name('GanClaw')
    .description('CLI to some JavaScript string utilities')
    .version('0.0.1');

program.command("wakeup").description("show bannner and pivk any one tool cli or telegram").action(async () => {
    console.log("GanClaw waking up....")
})

await program.parseAsync(process.argv)