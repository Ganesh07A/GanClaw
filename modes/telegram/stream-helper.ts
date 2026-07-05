import { clip } from "./text.ts";
import type { ToolLoopAgent } from "ai";

export async function generateTelegram(
  ctx: any,
  agent: ToolLoopAgent<never, any, any>,
  prompt: string,
  initialMessage: string = "⏳ Processing..."
): Promise<string> {
  let replyMsg: any = null;
  let text = "";
  
  try {
    replyMsg = await ctx.reply(initialMessage);
    const result = await agent.generate({ prompt });
    text = result.text || "(empty response)";
  } catch (error: any) {
    console.error("Error during Telegram generation:", error);
    const errorText = `❌ Error: ${error.message || error}`;
    if (replyMsg) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          replyMsg.message_id,
          undefined,
          errorText
        );
      } catch (err) {
        console.error("Failed to edit message on error:", err);
      }
    } else {
      await ctx.reply(errorText);
    }
    throw error;
  }

  const clipped = clip(text);
  try {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      replyMsg.message_id,
      undefined,
      clipped,
      { parse_mode: "Markdown" }
    );
  } catch (e: any) {
    if (e.description && e.description.includes("can't parse entities")) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          replyMsg.message_id,
          undefined,
          clipped
        );
      } catch (err) {
        console.error("Failed to edit message in plain text fallback:", err);
      }
    } else {
      console.error("Failed to edit Telegram message:", e);
    }
  }

  return text;
}
