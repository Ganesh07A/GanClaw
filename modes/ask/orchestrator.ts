import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { confirm, isCancel, text, select } from "@clack/prompts";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getAgentModel } from "../../ai/ai.config.ts";
import { ActionTracker } from "../agent/action.tracker.ts";
import { ToolExecutor } from "../agent/tool.executer.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import { renderTerminalMarkdown } from "../../tui/terminal-md.ts";
import { runApprovalFlow } from "../agent/approval.ts";
import { createWebTools } from "../plan/web-tools.ts";


import { createReadOnlyTools, createPersonalTools } from "../agent/agent.tools.ts";

function asMd(question: string, answer: string): string {
    return `# Ask Mode\n\n## Question\n\n${question.trim()}\n\n## Answer\n\n${answer.trim()}\n`;
}

export async function runAskMode() {
    console.log(chalk.bold("\n💡 Ask Mode\n"));

    const question = await text({ message: "What do you want to ask ?" });
    if (isCancel(question) || !question.trim()) return;

    const config = defaultAgentConfig()
    // only allow file creation , for storing 
    config.tools.allowFileCreation = true;
    config.tools.allowFileModification = false;
    config.tools.allowShellExecution = false;
    config.tools.allowFolderCreation = false;

    // for logging 
    const tracker = new ActionTracker();
    const executer = new ToolExecutor(config, tracker);

    const tools = {
        ...createReadOnlyTools(executer),
        ...createPersonalTools(executer),
        ...(process.env.FIRECRAWL_API_KEY ? createWebTools(tracker) : {})
    }

    const agent = new ToolLoopAgent({
        model: getAgentModel(),
        stopWhen: stepCountIs(20),
        tools
    })

    const result = await agent.stream({ prompt: question.trim() })
    let answer = "";
    process.stdout.write(chalk.bold("\nAnswer:\n"));
    for await (const chunk of result.textStream) {
        answer += chunk;
        process.stdout.write(chunk);
    }
    console.log("\n");

    // Print beautifully formatted markdown at the end
    console.log(chalk.dim("========================================"));
    console.log(renderTerminalMarkdown(asMd(question, answer)));
    console.log(chalk.dim("========================================"));

    const wantsSave = await confirm({
        message: "Do you want to save this conversation ?"
    })
    if (isCancel(wantsSave) || !wantsSave) return;

    let filename = "";
    let isModify = false;

    while (true) {
        const input = await text({
            message: "filename",
            initialValue: "ask.md",
            validate: (v) => {
                const s = (v ? v : '').trim()
                if (!s) return 'required'
                if (s.includes('/')) return 'no slash allowed'
                if (s.includes('\\')) return 'no backslash allowed'
                if (!s.toLowerCase().endsWith('.md')) return 'must end with .md'
            }
        });

        if (isCancel(input)) return;
        filename = input.trim();

        const filepath = path.join(config.codebasePath, filename);
        if (fs.existsSync(filepath)) {
            const action = await select({
                message: `File "${filename}" already exists. What would you like to do?`,
                options: [
                    { value: "rename", label: "Choose a different name" },
                    { value: "overwrite", label: "Overwrite the existing file" },
                    { value: "cancel", label: "Cancel saving" }
                ]
            });
            if (isCancel(action) || action === "cancel") return;
            if (action === "overwrite") {
                isModify = true;
                break;
            }
        } else {
            isModify = false;
            break;
        }
    }

    if (isModify) {
        config.tools.allowFileModification = true;
        executer.modifyFile(filename, asMd(question, answer));
    } else {
        executer.createFile(filename, asMd(question, answer));
    }
    const ok = await runApprovalFlow(tracker);
    if (!ok) return executer.clearStaging()

    executer.applyApprovedFromTracker()
    console.log(chalk.green("saved to file : ", filename))
}