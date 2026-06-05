import chalk from "chalk";
import {select, isCancel} from '@clack/prompts' 
import { runAgentMode } from "./agent/orchestrator.ts";

export async function runCli() {
    // wanna reperative asking 
    // diff modes 
    while (true) {
        const mode = await select({
            message: " Choose CLi Sub mode  ",
            options: [
                {value: "plan", label: "Plan", hint: "Plan any task"},
                {value: "agent", label: "Agent", hint: "user can use it"},
                {value: "ask", label: "Ask", hint: "user can ask any question"},
                {value: "back", label: "Back", hint: "return to main menu" }
            ]
        })  
        if (isCancel(mode )) {
            process.exit(0)
        }

        switch (mode) {
            case "plan":
                console.log(chalk.green("Plan mode selected"))
                break
            case "agent":
                await runAgentMode();
                break
            case "ask":
                console.log(chalk.green("Ask mode selected"))
                break
            case "back":
                console.log(chalk.green("Back to main menu"))
                return
        } 
    }
}