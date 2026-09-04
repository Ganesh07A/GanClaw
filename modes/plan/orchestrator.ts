
import chalk from "chalk";
import { isCancel, confirm, text } from '@clack/prompts'
import { getAgentModel } from "../../ai/ai.config.ts";
import { ToolLoopAgent, streamText, stepCountIs } from "ai";
import { ToolExecutor } from "../agent/tool.executor.ts";
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
        message: `Execute ${selected.length} step(s)?`,
        initialValue: true,
    })

    if (isCancel(proceed) || !proceed) {
        console.log(chalk.dim('Cancelled.'));
        return;
    }

    // after approval, shift to agent mode
    const config = defaultAgentConfig()
    const tracker = new ActionTracker()
    const executor = new ToolExecutor(config, tracker);



    const tools = {
        ...createAgentTools(executor),
        ...(process.env.FIRECRAWL_API_KEY ? createWebTools(tracker) : {}),
    }

    for (const step of selected) {
        console.log(chalk.bold(`\n🔧 ${step.title}\n`));

        const agent = new ToolLoopAgent({
            model: getAgentModel(),
            stopWhen: stepCountIs(30),
            tools
        });

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
        }
    }

    const ok = await runApprovalFlow(tracker);
    if (!ok) return executor.clearStaging();

    const { errors } = executor.applyApprovedFromTracker();
    if (errors.length) {
        console.log(chalk.red('\nSome operations reported errors:\n'));
        for (const e of errors) console.log(chalk.red(`  • ${e}`));
    } else {
        console.log(chalk.green('\n✓ Applied.\n'));
    }
    executor.clearStaging();
}
