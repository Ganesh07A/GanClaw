import { Output, extractJsonMiddleware, generateText, stepCountIs, wrapLanguageModel } from "ai";
import { z } from "zod";
import { getAgentModel } from "../../ai/ai.config.ts";
import { ActionTracker } from "../agent/action.tracker.ts";
import { ToolExecutor } from "../agent/tool.executor.ts";
import { defaultAgentConfig } from "../agent/types.ts";
import chalk from "chalk";
import type { Plan, PlanStep } from "./types.ts";
import { createReadOnlyTools } from "../agent/agent.tools.ts";
import { createWebTools } from "./web-tools.ts";

const PlanSchema = z.object({
    plan: z.object({
        goal: z.string(),
        researchSummary: z.string().optional(),
        steps: z.array(z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            hints: z.array(z.string()).optional(),
            complexity: z.enum(['low', 'medium', 'high', 'very_high'])
        })).min(1).max(15)
    })
});

const PLAN_INSTRUCTIONS = (codebase: string, hasWeb: boolean) =>
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
    const executor = new ToolExecutor(config, tracker);

    const hasWeb = !!process.env.FIRECRAWL_API_KEY;
    const model = wrapLanguageModel({
        model: getAgentModel(),
        middleware: extractJsonMiddleware()
    });

    const tools = {
        ...createReadOnlyTools(executor),
        ...(hasWeb ? createWebTools(tracker) : {})
    };

    console.log(chalk.cyan("Researching and drafting a plan...\n"));

    const result = await generateText({
        model,
        tools,
        stopWhen: stepCountIs(20),
        system: PLAN_INSTRUCTIONS(config.codebasePath, hasWeb),
        prompt: `User Goal: \n${goal}`,
        output: Output.object({ schema: PlanSchema })
    });

    const validated = PlanSchema.parse(result.output);

    const steps: PlanStep[] = validated.plan.steps.map((s, i) => ({
        id: `step-${i + 1}`,
        title: s.title,
        description: s.description,
        hints: s.hints,
        complexity: s.complexity
    }));

    return { goal, researchSummary: validated.plan.researchSummary, steps };
}
