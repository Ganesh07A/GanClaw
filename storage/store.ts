import fs from "node:fs";
import path from "node:path";
import { ganclawHome, encrypt, decrypt } from "./crypto.ts";

/**
 * EncryptedStore — read/write JSON data to encrypted files in ~/.ganclaw/
 *
 * Usage:
 *   const store = new EncryptedStore<MyData>("memory.json");
 *   store.write({ facts: [...] });
 *   const data = store.read();
 */
export class EncryptedStore<T> {
  private readonly filePath: string;

  constructor(filename: string, subdir?: string) {
    const base = subdir ? path.join(ganclawHome(), subdir) : ganclawHome();
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    this.filePath = path.join(base, filename);
  }

  /** Check if the store file exists */
  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  /** Read and decrypt the stored data. Returns undefined if file doesn't exist. */
  read(): T | undefined {
    if (!this.exists()) return undefined;
    try {
      const raw = fs.readFileSync(this.filePath);
      const json = decrypt(raw);
      return JSON.parse(json) as T;
    } catch (err) {
      console.error(`[EncryptedStore] Failed to read ${this.filePath}:`, err);
      return undefined;
    }
  }

  /** Encrypt and write data to disk. */
  write(data: T): void {
    const json = JSON.stringify(data, null, 2);
    const encrypted = encrypt(json);
    fs.writeFileSync(this.filePath, encrypted, { mode: 0o600 });
  }

  /** Read → mutate → write helper. Creates default if file doesn't exist. */
  update(defaultValue: T, mutator: (data: T) => T): T {
    const current = this.read() ?? defaultValue;
    const updated = mutator(current);
    this.write(updated);
    return updated;
  }

  /** Delete the store file. */
  delete(): void {
    if (this.exists()) fs.unlinkSync(this.filePath);
  }
}
