import { Telegraf } from "telegraf";
import chalk from "chalk";
import { WELCOME } from "./constants.ts";
import { log } from "console";
import { registerHandlers } from "./handlers.ts";

export async function runTelegramBot() {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const ownerId = process.env.TELEGRAM_OWNER_ID;

    const bot = new Telegraf(token!)
    registerHandlers(bot);

    await bot.telegram.sendMessage(ownerId!,WELCOME, {parse_mode:"Markdown"})
    console.log(chalk.green("We sent a welcome message on telegram! \n"))

    bot.launch();
    console.log(chalk.green("Telegram bot is running. Press Ctrl+C to stop.\n"))

    await new Promise<void>((resolve) => {
        process.once("SIGINT", resolve);
        process.once("SIGTERM", resolve);
    });
    bot.stop();
    console.log(chalk.green("Telegram bot stopped\n"));

}