import { select , isCancel , spinner} from "@clack/prompts"
import chalk from "chalk"
import figlet from "figlet"
import { runCli } from "../modes/cli.ts"

const BANNER_FONT='ANSI Shadow'
const SHADOW= chalk.hex('#5b4d9e')
const FACE= chalk.hex('#e8dcf8').bold


// for shadow text print
function printBannerWithShadow(ascii: string) {

  const bannerLines = ascii.replace(/\s+$/, '').split('\n');
  const maxLen = Math.max(...bannerLines.map((l) => l.length), 0);
  const rowWidth = maxLen + 2;

  for (const line of bannerLines) {
    console.log(SHADOW(('  ' + line).padEnd(rowWidth)));
  }
  process.stdout.write(`\x1b[${bannerLines.length}A`);
  for (const line of bannerLines) {
    console.log(FACE(line.padEnd(rowWidth)));
  }
  console.log();
}




export async function runwakeup() {
    let ascii:string;
    try {
        ascii=figlet.textSync("GanClaw", { font:BANNER_FONT})
    } catch (err) {
        ascii = figlet.textSync("GanClaw", {font:"Standard"})
    }
    printBannerWithShadow(ascii)

    // creating two modes 
    const mode = await select({
        message: " Which mode you want to select ? ",
        options:[
            {value: "cli", label: "CLI", hint: "use terminal"},
            {value: "telegram", label: "Telegram", hint: "use telegram bot"},
            {value: "exit", label: "Exit", hint: "for quit application" }
        ]
    })

    if (isCancel(mode)) process.exit(0);

    if (mode === "cli") {
        await runCli()
    }
    else if(mode === "telegram") {
        console.log(chalk.dim("telegram mode started....."))
    }
    else if (mode === "exit") {
        console.log(chalk.dim("Good bye , from GanClaw CLI"))
        process.exit(0)
    }    

    
}