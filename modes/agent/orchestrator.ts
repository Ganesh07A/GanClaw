import  chalk from "chalk"
import { isCancel, text, spinner } from "@clack/prompts";
import { defaultAgentConfig } from "./types.ts";
import { ActionTracker } from "./action.tracker.ts";
import { ToolExecuter } from "./tool.executer.ts";

export async function runAgentMode() {
    console.log(chalk.bold("Agent Mode 🤖"));

    //accepting goal 
    const goal = await text({
        message: "What would you like to achieve ?",
        placeholder: "type your goal here"
    })

    if (isCancel(goal || goal.trim())) {
        console.log(chalk.yellow("cancelled"))
        return
    }

    //show loading 
    const s = spinner()
    s.start("Agent is thinking... ")

    const config = defaultAgentConfig()
    const tracker = new ActionTracker()
    const executor = new ToolExecuter(config, tracker)
}