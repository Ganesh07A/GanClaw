
import chalk from "chalk";
import { isCancel, confirm, text } from '@clack/prompts'
import { getAgentModel } from "../../ai/ai.config.ts";
import { ToolLoopAgent, streamText, stepCountIs } from "ai";
import { ToolExecutor } from "../agent/tool.executer.ts";
import { createAgentTools } from "../agent/agent.tools.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import { runApprovalFlow } from "../agent/approval.ts";
import { renderTerminalMarkdown } from "../../tui/terminal-md.ts";
import { ActionTracker } from "../agent/action.tracker.ts";
import { generatePlan } from "./planner.ts";
import { printPlan, selectSteps } from "./selection.ts";
import type { PlanStep } from "./types.ts";
import { createWebTools } from "./web-tools.ts";

function stepPrompt(goal: string, step: PlanStep): string {
    return [`Goal: ${goal}`, `Step: ${step.title}`, step.description].join('\n');
}



export async function runPlanMode(): Promise<void> {
    console.log(chalk.bold('\n💡 Plan Mode \n'))

    const goal = await text({ message: "what is your goal ? " })
    if (isCancel(goal) || !goal.trim()) return;

    const plan = await generatePlan(goal)

    printPlan(plan)

    const selected = await selectSteps(plan);
    if (selected.length == 0) return;

    const proceed = await confirm({
        message: `Execute ${selected.length} steps(s)`,
        initialValue: true,

    })

    // after approve shift to agent mode 
    const config = defaultAgentConfig()
    const tracker = new ActionTracker()
    const executer = new ToolExecutor(config, tracker);



    const tools = {
        ...createAgentTools(executer) ,
        ...createWebTools(tracker),
        
    }

    for (const step of selected) {
        console.log(chalk.bold(`\n🔧 ${step.title}\n`));

        const agent = new ToolLoopAgent({
            model: getAgentModel(),
            stopWhen: stepCountIs(30),
            tools
        });

        const r = await agent.generate({ prompt: stepPrompt(plan.goal, step) })

        if (r.text) return console.log(renderTerminalMarkdown(r.text))

    }

    const ok = await runApprovalFlow(tracker);
    if (!ok) return executer.clearStaging();

    const { errors } = executer.applyApprovedFromTracker();
    if (errors.length) {
        console.log(chalk.red('\nSome operations reported errors:\n'));
        for (const e of errors) console.log(chalk.red(`  • ${e}`));
    } else {
        console.log(chalk.green('\n✓ Applied.\n'));
    }
    executer.clearStaging();
}
