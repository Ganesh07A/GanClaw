import fs from 'fs'
import path from "path";
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import type { AgentConfig, ActionLog } from "./types.ts";
import { ActionTracker } from "./action.tracker.ts";

// utf-8 is the default encoding for text files
const TEXT_EXT = new Set([
    "txt", "md", "ts", "tsx", "js", "jsx", "html",
    "css", "json", "yaml", "yml", "py", "java",
    "c", "cpp", "cs", "php", "go", "rb",
    "rs", "sh", "bat", "ps1", "sql", "log",
    "conf", "ini", "cfg", "toml", "json5",
])


// what is func do --> check this file extension is text or not 
function isProbabyTextfile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return TEXT_EXT.has(ext) || ext === '';
}

export class ToolExecuter {

    // overlay is for --> staging the changes done by the agent
    private overlay = new Map<string, string>();
    // delted is for --> marking the files as deleted
    private deleted = new Set<string>();
    // this is for normalizing the path --> converting the path to posix & posix relative path

    // converting windows messay //static\\etc\\ to better /static/etc/ & removing // --> empty 
    private readonly norm = (rel: string) => path.posix.normalize(rel.split(path.sep).join("/")).replace(/^\//, "");

    // for initilization of the class
    constructor(
        private readonly config: AgentConfig,
        private readonly tracker: ActionTracker,) { }


    // this is for resolving the absolute path --> converting the absolute path to posix & posix relative path
    // preventing escaping the workspace (security)
    private resolveSafe(rel: string): string {
        const abs = path.resolve(this.config.codebasePath, rel);
        const root = path.resolve(this.config.codebasePath);
        const relCheck = path.relative(root, abs);
        if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
            throw new Error(`Path escapes workspace: ${rel}`);
        }
        return abs;
    }


    // excluded --> descides which file to ignore or not to consider for modifications
    private excluded(relPath: string): boolean {
        const norm = this.norm(relPath);
        const segments = norm.split("/");
        const base = segments[segments.length - 1] ?? "";

        for (const pat of this.config.excludePatterns) {
            if (pat === "*.log" && base.endsWith(".log")) return true;
            if (pat === ".env*" && base.startsWith(".env")) return true;
            if (pat.includes("*")) continue;
            if (segments.includes(pat) || norm === pat || norm.startsWith(`${pat}/`))
                return true;
        }
        return false;
    }


    // checking whether the file is excluded or not
    private assertNotExcluded(rel: string, op: string): void {
        if (this.excluded(rel)) {
            throw new Error(`${op}: path is excluded by policy: ${rel}`);
        }
    }


    // getting the text of the file --> either from overlay or from the disk
    getEffectiveText(rel: string): string | undefined {
        const key = this.norm(rel);
        if (this.deleted.has(key)) return undefined;
        if (this.overlay.has(key)) return this.overlay.get(key);
        const abs = this.resolveSafe(rel);
        if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return undefined;
        return fs.readFileSync(abs, "utf8");
    }

   readFile(rel: string): string {
    this.assertNotExcluded(rel, "read_file");
    const abs = this.resolveSafe(rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      throw new Error(`File not found: ${rel}`);
    }
    const st = fs.statSync(abs);
    if (st.size > this.config.maxFileSizeToRead) {
      throw new Error(`File too large: ${rel}`);
    }
    const text = fs.readFileSync(abs, "utf8");
    this.tracker.log({
      type: "code_analysis",
      path: this.norm(rel),
      details: { after: text, toolName: "read_file" },
      status: "executed",
    });
    return text;
  }

  createFile(rel: string, content: string): string {
    if (!this.config.tools.allowFileCreation)
      throw new Error("File creation disabled");
    this.assertNotExcluded(rel, "create_file");
    const key = this.norm(rel);
    const abs = this.resolveSafe(rel);
    if (fs.existsSync(abs) && !this.deleted.has(key)) {
      throw new Error(`create_file: already exists: ${rel}`);
    }
    this.deleted.delete(key);
    this.overlay.set(key, content);
    this.tracker.log({
      type: "file_create",
      path: key,
      details: { after: content },
      status: "pending",
    });
    return `Staged new file: ${key}`;
  }

}