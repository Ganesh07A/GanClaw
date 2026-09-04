import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT_LEN = 16;

/**
 * Returns the root directory for all GanClaw persistent data.
 * Creates it if it doesn't exist.
 */
export function ganclawHome(): string {
  const dir = path.join(homedir(), ".ganclaw");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Path to the secret key file.
 * The key is auto-generated on first use and stored here.
 */
const keyFilePath = () => path.join(ganclawHome(), ".secret");

/**
 * Derives a 256-bit key from a passphrase + salt using PBKDF2.
 * Used when the user provides a custom passphrase.
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, 100_000, KEY_LEN, "sha512");
}

/**
 * Gets or creates the master encryption key.
 *
 * Strategy:
 * - On first run: generate a random 256-bit key, write to ~/.ganclaw/.secret
 * - On subsequent runs: read the existing key
 * - If GANCLAW_PASSPHRASE env var is set, derive the key from that instead
 */
export function getMasterKey(): Buffer {
  const passphrase = process.env.GANCLAW_PASSPHRASE;

  if (passphrase) {
    // Derive from passphrase — salt stored alongside
    const saltPath = path.join(ganclawHome(), ".salt");
    let salt: Buffer;
    if (fs.existsSync(saltPath)) {
      salt = fs.readFileSync(saltPath);
    } else {
      salt = randomBytes(SALT_LEN);
      fs.writeFileSync(saltPath, salt, { mode: 0o600 });
    }
    return deriveKey(passphrase, salt);
  }

  // Auto-generated key
  const kf = keyFilePath();
  if (fs.existsSync(kf)) {
    return fs.readFileSync(kf);
  }
  const key = randomBytes(KEY_LEN);
  fs.writeFileSync(kf, key, { mode: 0o600 });
  return key;
}

/**
 * Encrypt a UTF-8 string using AES-256-GCM.
 * Returns a Buffer: [IV (16 bytes)] [Auth Tag (16 bytes)] [Ciphertext (...)]
 */
export function encrypt(plaintext: string, key?: Buffer): Buffer {
  const k = key ?? getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, k, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt a buffer produced by encrypt().
 * Returns the original UTF-8 string.
 * Throws if the key is wrong or data is tampered.
 */
export function decrypt(data: Buffer, key?: Buffer): string {
  const k = key ?? getMasterKey();

  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(IV_LEN + TAG_LEN);

  const decipher = createDecipheriv(ALGO, k, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
