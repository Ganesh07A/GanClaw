import { tool } from "ai";
import { z } from "zod";
import type { MemoryManager } from "../core/memory.ts";

export function createMemoryTools(memory: MemoryManager) {
  return {
    remember_fact: tool({
      description:
        "Store a fact about the user for future reference. Use this when the user shares personal info, preferences, or important context you should remember.",
      inputSchema: z.object({
        fact: z
          .string()
          .describe(
            "The fact to remember, e.g. 'User prefers TypeScript' or 'User's name is Ganesh'",
          ),
        source: z
          .enum(["user_said", "inferred"])
          .describe("Whether the user explicitly said this or you inferred it"),
      }),
      execute: async ({ fact, source }) => memory.addFact(fact, source),
    }),

    recall: tool({
      description:
        "Search past conversations and known facts for relevant context. Use this when you need to remember something from a previous conversation.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("What to search for in memory (keywords or topic)"),
      }),
      execute: async ({ query }) => memory.searchMemory(query),
    }),

    list_known_facts: tool({
      description: "List everything you currently know/remember about the user.",
      inputSchema: z.object({}),
      execute: async () => {
        const facts = memory.getFacts();
        if (facts.length === 0)
          return "I don't have any stored facts about the user yet.";
        return facts
          .map(
            (f, i) =>
              `${i + 1}. ${f.fact} (${f.source}, confidence: ${f.confidence})`,
          )
          .join("\n");
      },
    }),

    forget_fact: tool({
      description:
        "Remove a stored fact about the user. Use when the user asks you to forget something.",
      inputSchema: z.object({
        fact_text: z
          .string()
          .describe("The fact text to search for and remove"),
      }),
      execute: async ({ fact_text }) => {
        const facts = memory.getFacts();
        const match = facts.find((f) =>
          f.fact.toLowerCase().includes(fact_text.toLowerCase()),
        );
        if (!match) return `No matching fact found for: "${fact_text}"`;
        memory.removeFact(match.id);
        return `Forgot: "${match.fact}"`;
      },
    }),
  };
}
