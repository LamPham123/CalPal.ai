/**
 * Test script to verify encryption/decryption works
 * Run with: npx tsx scripts/test-encryption.ts
 */

import { encrypt, decrypt } from "../lib/encryption";

// Make sure ENCRYPTION_KEY is set
if (!process.env.ENCRYPTION_KEY) {
  console.error("❌ ENCRYPTION_KEY environment variable is not set");
  console.log("Generate one with: openssl rand -base64 32");
  process.exit(1);
}

const testData = [
  "ya29.a0AfB_byC-example-access-token",
  "1//0g-refresh-token-example",
  "test@example.com",
];

console.log("🔐 Testing encryption/decryption...\n");

for (const original of testData) {
  console.log(`Original: ${original.substring(0, 20)}...`);

  const encrypted = encrypt(original);
  console.log(`Encrypted: ${encrypted.substring(0, 40)}...`);

  const decrypted = decrypt(encrypted);
  console.log(`Decrypted: ${decrypted.substring(0, 20)}...`);

  if (original === decrypted) {
    console.log("✅ Match!\n");
  } else {
    console.error("❌ Mismatch!\n");
    process.exit(1);
  }
}

console.log("✅ All encryption tests passed!");
