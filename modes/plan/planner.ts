import { Output, extractJsonMiddleware, generateText, stepCountIs, tool, wrapLanguageModel } from "ai";
import { z } from "zod";
import { getAgentModel } from "../../ai/ai.config";
import { ActionTracker } from "../agent/action.tracker";
import { ToolExecutor } from "../agent/tool.executer";
import { defaultAgentConfig } from "../agent/types";
import chalk from "chalk";
import type { Plan, PlanStep } from "./types.ts"
import { createAgentTools } from "../agent/agent.tools.ts";
import { platform } from "node:os";


const PlanSchema = z.object({
    plan: z.object({
        goal: z.string(),
        reserachSummary: z.string().optional(),
        steps: z.array(z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            hints: z.array(z.string()).optional(),
            complexity: z.enum(['low', 'medium', 'high', 'very_high'])
        })).min(1).max(15)
    })
})


function readOnlyTools(executer: ToolExecutor) {
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

const PLAN_INTERUCTIONS = (codebase: string, hasWeb: boolean) =>
    [
        "You are a Plan-Mode planner. You DO NOT modify files.",
        `Workspace: ${codebase}`,
        "Use read-only tools for codebase/skills research.",
        hasWeb
            ? "Web tools are available (web_search/web_crawl/fetch_url). Use only when needed."
            : "Web tools are unavailable (no FIRECRAWL_API_KEY).",
        "Output must match the provided JSON schema.",
        "Keep it short: 1–15 steps.",
    ].join("\n");


export async function generatePlan(goal: string) {
    const config = defaultAgentConfig();
    const tracker = new ActionTracker();
    const executer = new ToolExecutor(config, tracker);


    const hasWeb = false
    const model = wrapLanguageModel({
        model: getAgentModel(),
        middleware: extractJsonMiddleware()
    })

    // TODO: wen crawling tools 
    const tools = { ...readOnlyTools(executer) }

    console.log(chalk.cyan("Reseraching and drafting a plan...\n"))

    const result = await generateText({
        model,
        tools,
        stopWhen:stepCountIs(20),
        system: PLAN_INTERUCTIONS(config.codebasePath, hasWeb),
        prompt: `User Goal: \n${goal}`,
        output: Output.object({ schema: PlanSchema })
    })

    const validated = PlanSchema.parse(result.output)
    
    const steps:PlanStep[] = validated.plan.steps.map((s , i)=>({
    id:`step-${i+1}`,
    title:s.title,
    description:s.description,
    hints:s.hints,
    complexity:s.complexity
  }));

  return {goal , researchSummary:validated.plan.reserachSummary , steps}
}


