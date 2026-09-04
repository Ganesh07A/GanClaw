
    # 🦅 GanClaw

    **Your personal AI buddy — coding assistant, task runner, and conversational companion.**

    GanClaw is a terminal-first AI assistant that helps you code, manage tasks, set reminders, browse the web, handle email, and chat naturally — all from your CLI.

    ---

    ## ✨ Features

    - 💬 **Chat Mode** — Have natural, casual conversations with your AI buddy
    - 🤖 **Agent Mode** — Let GanClaw autonomously plan and execute multi-step tasks
    - 📋 **Task Management** — Create, list, complete, and delete todos
    - ⏰ **Reminders** — Set timed reminders that nudge you when it's time
    - 🧠 **Memory** — GanClaw remembers facts about you across sessions
    - 🌐 **Web Tools** — Search the web, fetch URLs, and crawl pages for fresh info
    - 📧 **Email** — Check inbox and send emails via SMTP/IMAP
    - 💻 **Coding Assistant** — Read, write, and analyze code in your project
    - 🎨 **Beautiful TUI** — A polished terminal UI powered by Clack
    - 📱 **Telegram Integration** — Chat with GanClaw on the go (optional)

    ---

    ## 🚀 Quick Start

    ### Prerequisites

    - Node.js `>= 20`
    - [pnpm](https://pnpm.io/) `>= 10`

    ### Install

    ```bash
    pnpm install

### Configure

Create a .env file in the project root:

    # AI Provider
    OPENROUTER_API_KEY=your_openrouter_key

    # Email (optional)
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password

    # Telegram Bot (optional)
    TELEGRAM_BOT_TOKEN=your_bot_token

    # Debug
    DEBUG=false

### Run

    # Launch the interactive TUI to pick a mode
    pnpm wakeup

    # Or jump straight into chat mode
    pnpm chat

--------------------------------------------------------------------------------------------------------

## 🎯 Usage

GanClaw has two main entry points:

### GanClaw wakeup

Launches a beautiful interactive TUI where you can pick the mode you want to work in (Chat, Agent, Plan,
Ask, etc.).

### GanClaw chat

Boots straight into a back-and-forth conversation with GanClaw. Just talk naturally — ask for code, set
reminders, or just hang out.

--------------------------------------------------------------------------------------------------------

## 🛠️ What Can GanClaw Do?

┌───────────┬─────────────────────────────────────────────────────────────────┐
│ Category  │ Examples                                                        │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Coding    │ "Analyze my codebase", "Write a function", "Refactor this file" │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Tasks     │ "Add task: review PR tonight", "Show my todos"                  │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Reminders │ "Remind me in 10 min to take a break"                           │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Memory    │ "Remember that I love dark mode"                                │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Web       │ "Search the latest Node.js docs", "Fetch this URL"              │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Email     │ "Check my inbox", "Send an email to..."                         │
├───────────┼─────────────────────────────────────────────────────────────────┤
│ Chat      │ "Hey buddy, how are you?"                                       │
└───────────┴─────────────────────────────────────────────────────────────────┘

--------------------------------------------------------------------------------------------------------

## 🏗️ Architecture

    GanClaw/
    ├── ai/              # AI provider setup (OpenRouter, system prompts)
    ├── core/            # Core services (memory, tasks, reminders, sessions)
    ├── modes/           # Operating modes (chat, agent, plan, ask, telegram, CLI)
    ├── tools/           # Tool definitions exposed to the AI
    ├── tui/             # Terminal UI components
    ├── storage/         # Local data persistence
    ├── todo-app/        # Sample/demo project
    └── index.ts         # CLI entry point

--------------------------------------------------------------------------------------------------------

## 🧰 Tech Stack

    * **TypeScript** — Type-safe everywhere
    * **Node.js** — Runtime
    * **Commander** — CLI framework
    * **Clack** — Beautiful terminal prompts & UI
    * **Vercel AI SDK** — LLM orchestration
    * **OpenRouter** — Model routing
    * **Zod** — Schema validation
    * **Telegraf** — Telegram bot framework

--------------------------------------------------------------------------------------------------------

## 📜 License

ISC

--------------------------------------------------------------------------------------------------------

## 💖 Made with love by Ganesh

    "Coffee, code, and conversations — that's the GanClaw way." ☕


    ---
