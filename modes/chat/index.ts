import { text, isCancel } from "@clack/prompts";
import chalk from "chalk";
import { ToolLoopAgent, stepCountIs } from "ai";
import { getAgentModel } from "../../ai/ai.config.ts";
import { Session } from "../../core/session.ts";
import { buildSystemPrompt } from "../../core/prompt-builder.ts";
import { renderTerminalMarkdown } from "../../tui/terminal-md.ts";
import {
  createReadOnlyTools,
  createPersonalTools,
} from "../agent/agent.tools.ts";
import { createWebTools } from "../plan/web-tools.ts";
import { createMemoryTools } from "./memory-tools.ts";

/**
 * Chat Mode — interactive conversational loop with GanClaw.
 *
 * Unlike Ask mode (single question → single answer), Chat mode maintains
 * a multi-turn conversation with memory persistence.
 */
export async function runChatMode(): Promise<void> {
  const session = new Session("chat", {
    allowFileCreation: false,
    allowFileModification: false,
    allowFolderCreation: false,
    allowShellExecution: false,
  });

  const userName = session.profile.get().name;
  const greeting = userName
    ? `Hey ${userName}! What's on your mind?`
    : `Hey! I'm GanClaw. What's on your mind?`;

  console.log(chalk.bold(`\n🐾 GanClaw Chat\n`));
  console.log(chalk.dim(greeting));
  console.log(chalk.dim('(Type "exit" or "bye" to quit)\n'));

  // Build tools — read-only + personal + web + memory (no file mutations in chat)
  const tools = {
    ...createReadOnlyTools(session.executor),
    ...createPersonalTools(session.executor),
    ...(process.env.FIRECRAWL_API_KEY ? createWebTools(session.tracker) : {}),
    ...createMemoryTools(session.memory),
  };

  // Conversation messages for multi-turn context
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  while (true) {
    const input = await text({
      message: chalk.cyan("You"),
      placeholder: "...",
    });

    if (isCancel(input)) break;

    const userMsg = input.trim();
    if (!userMsg) continue;

    // Exit keywords
    if (/^(exit|bye|quit|q)$/i.test(userMsg)) {
      console.log(chalk.dim("\n🐾 Later! See you around.\n"));
      break;
    }

    // Log user message to memory
    session.memory.logMessage("user", userMsg, "chat");
    messages.push({ role: "user", content: userMsg });

    // Build fresh system prompt with latest context
    const systemPrompt = buildSystemPrompt(session.profile, session.memory, {
      mode: "chat",
      workspacePath: session.config.codebasePath,
      extraInstructions: [
        "You are in chat mode — a back-and-forth conversation.",
        "Keep responses natural and conversational.",
        "You can use tools to help answer questions.",
      ],
    });

    const agent = new ToolLoopAgent({
      model: getAgentModel(),
      stopWhen: stepCountIs(15),
      instructions: systemPrompt,
      tools,
    });

    // Build the prompt with conversation context
    const contextualPrompt = messages
      .slice(-10) // last 10 messages for context window
      .map((m) => `${m.role === "user" ? "User" : "GanClaw"}: ${m.content}`)
      .join("\n");

    try {
      const result = await agent.stream({
        prompt: contextualPrompt,
      });

      let response = "";
      process.stdout.write(chalk.bold("\n"));
      for await (const chunk of result.textStream) {
        response += chunk;
        process.stdout.write(chunk);
      }
      console.log("\n");

      // Pretty-print if it has markdown content
      if (
        response.includes("```") ||
        response.includes("##") ||
        response.includes("**")
      ) {
        console.log(chalk.dim("────────────────────────────────────────"));
        console.log(renderTerminalMarkdown(response));
        console.log(chalk.dim("────────────────────────────────────────"));
      }

      // Log assistant response to memory
      session.memory.logMessage("assistant", response, "chat");
      messages.push({ role: "assistant", content: response });

      // Update recent topics (extract a rough topic from the user message)
      if (userMsg.length > 10) {
        session.profile.addRecentTopic(
          userMsg.slice(0, 60) + (userMsg.length > 60 ? "..." : ""),
        );
      }
    } catch (err: any) {
      console.error(chalk.red(`\n❌ Error: ${err.message}\n`));
    }
  }
}
