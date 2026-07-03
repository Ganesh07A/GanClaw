import { Telegraf } from "telegraf";
import { isOwner } from "./auth.ts";
import { WELCOME } from "./constants.ts";

export async function registerHandlers(bot: Telegraf) {
    bot.command("start", async(ctx) => {
        if(!isOwner(ctx.chat.id)) return;
        await ctx.reply(WELCOME, {parse_mode:"Markdown"})
    })
}