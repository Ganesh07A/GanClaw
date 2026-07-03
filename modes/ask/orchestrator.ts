import chalk from "chalk";
import { confirm, isCancel, text } from "@clack/prompts";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getAgentModel } from "../../ai/ai.config.ts";
import { ActionTracker } from "../agent/action.tracker.ts";
import { ToolExecutor } from "../agent/tool.executer.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import { renderTerminalMarkdown } from "../../tui/terminal-md.ts";
import { runApprovalFlow } from "../agent/approval.ts";


function createAskTools(executer: ToolExecutor) {
    return {
        read_file: tool({
            description:
                "Read a text file from the workspace. Use a path relative to the project root.",
            inputSchema: z.object({
                path: z.string().describe("Relative file path"),
            }),
            execute: async ({ path: p }) => executer.readFile(p),
        }),

        list_files: tool({
            description: "List files and directories under a path.",
            inputSchema: z.object({
                path: z.string(),
                recursive: z.boolean().optional().default(false),
            }),
            execute: async ({ path: p, recursive }) =>
                executer.listFiles(p, recursive),
        }),

        search_files: tool({
            description:
                'Find files matching a glob pattern (e.g. "*.ts", "**/*.md"). Optional content substring filter.',
            inputSchema: z.object({
                root: z.string().describe("Directory to search, relative to root"),
                pattern: z
                    .string()
                    .describe("Glob-like pattern using * and ** (forward slashes)"),
                content_contains: z.string().optional(),
            }),
            execute: async ({ root, pattern, content_contains }) =>
                executer.searchFiles(root, pattern, content_contains),
        }),

        analyze_codebase: tool({
            description:
                "Summarize structure: file counts, size, extensions. Read-only.",
            inputSchema: z.object({
                path: z.string().default("."),
            }),
            execute: async ({ path: p }) => executer.analyzeCodebase(p),
        }),


        list_skills: tool({
            description:
                "List absolute paths to SKILL.md files under configured skill directories (Cursor / Claude).",
            inputSchema: z.object({}),
            execute: async () => executer.listSkills(),
        }),

        read_skill: tool({
            description:
                "Read a SKILL.md file. Path must be absolute and under skill roots, or use a path returned by list_skills.",
            inputSchema: z.object({
                path: z.string(),
            }),
            execute: async ({ path: p }) => executer.readSkill(p),
        }),
    }

}
function asMd(question: string, answer: string): string {
    return `# Ask Mode\n\n## Question\n\n${question.trim()}\n\n## Answer\n\n${answer.trim()}\n`;
}

export async function runAskMode() {
    console.log(chalk.bold("\n💡 Ask Mode\n"));

    const question = await text({message: "What do you want to ask ?"});
    if(isCancel(question) || !question.trim()) return;
    
    const config = defaultAgentConfig()
    // only alllow file creation , for storing 
    config.tools.allowFileCreation = true;
    config.tools.allowFileModification = false;
    config.tools.allowShellExecution = false;
    config.tools.allowFolderCreation = false;

    // for logging 
    const traker = new ActionTracker();
    const executer = new ToolExecutor(config, traker);
    
   // TODO:  web serach tool : firecrawl --> 

   const tools = {
    ...createAskTools(executer)
   }

   const agent = new ToolLoopAgent({
    model: getAgentModel(),
    stopWhen: stepCountIs(20),
    tools
   })

   const result = await agent.generate({prompt:question.trim()})
   const answer = result.text?.trim() || "(no answer)"
   console.log(renderTerminalMarkdown(asMd(question,answer))) 

   const wantsSave = await confirm({
    message: "Do you want to save this conversation ?"
   })
   if(isCancel(wantsSave) || !wantsSave) return;
   const filename = await text({
    message:"filename",
    initialValue: "ask.md",
    validate: (v)=> {
        const s = (v ? v : '').trim()
        if (!s) return 'required'
        if (s.includes('/')) return 'no slash allowed'
        if (s.includes('\\')) return 'no backslash allowed'
        if (!s.toLowerCase().endsWith('.md')) return 'must end with .md'
    }

   })

   if(isCancel(filename)) return;

   executer.createFile(filename, asMd(question, answer));
   const ok  = await runApprovalFlow(traker);
   if(!ok) return executer.clearStaging()

    executer.applyApprovedFromTracker()
    console.log(chalk.green("saved to file : ", filename))
}