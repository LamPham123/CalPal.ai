import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Ensure key is exactly 32 bytes
  return crypto.createHash("sha256").update(key).digest();
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Return IV + encrypted data + auth tag, all hex encoded
  return iv.toString("hex") + encrypted + tag.toString("hex");
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  // Extract IV, encrypted data, and auth tag
  const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), "hex");
  const tag = Buffer.from(encryptedData.slice(-TAG_LENGTH * 2), "hex");
  const encrypted = encryptedData.slice(IV_LENGTH * 2, -TAG_LENGTH * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
