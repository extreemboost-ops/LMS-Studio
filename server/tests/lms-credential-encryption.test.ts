import { LMSCryptoService } from "../src/modules/lms/lms-crypto.service.js";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runLmsCredentialEncryptionTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || "Assertion failed" });
    }
  }

  // 1. AES-256-GCM Encryption Structure
  try {
    const originalCreds = {
      clientId: "canvas_client_1002",
      clientSecret: "super_secret_oauth_key_9941_abcdef",
      apiKey: "bearer_token_xyz987654321",
      customHeaders: { "X-LMS-Domain": "canvas.local" },
    };

    const encrypted = LMSCryptoService.encrypt(originalCreds);
    assert("AES-256-GCM encryption outputs iv", Boolean(encrypted.iv && encrypted.iv.length === 24)); // 12 bytes = 24 hex chars
    assert("AES-256-GCM encryption outputs auth tag", Boolean(encrypted.tag && encrypted.tag.length === 32)); // 16 bytes = 32 hex chars
    assert("AES-256-GCM encryption outputs ciphertext data", Boolean(encrypted.data));

    // 2. Successful Decryption
    const decrypted = LMSCryptoService.decrypt(encrypted);
    assert("AES-256-GCM decrypts clientId correctly", decrypted.clientId === originalCreds.clientId);
    assert("AES-256-GCM decrypts clientSecret correctly", decrypted.clientSecret === originalCreds.clientSecret);
    assert("AES-256-GCM decrypts apiKey correctly", decrypted.apiKey === originalCreds.apiKey);
  } catch (err: any) {
    assert("AES-256-GCM encryption/decryption threw error", false, err.message);
  }

  // 3. Tamper Detection via Auth Tag (AEAD Invariant)
  try {
    const creds = { token: "secret_value_123" };
    const enc = LMSCryptoService.encrypt(creds);

    // Tamper with encrypted data
    const tamperedData = enc.data.slice(0, -2) + "ff";
    let tamperedRejected = false;
    try {
      LMSCryptoService.decrypt({ ...enc, data: tamperedData });
    } catch {
      tamperedRejected = true;
    }
    assert("AES-256-GCM rejects tampered ciphertext data", tamperedRejected);

    // Tamper with authentication tag
    const tamperedTag = enc.tag.slice(0, -2) + "00";
    let tagTamperedRejected = false;
    try {
      LMSCryptoService.decrypt({ ...enc, tag: tamperedTag });
    } catch {
      tagTamperedRejected = true;
    }
    assert("AES-256-GCM rejects tampered authentication tag", tagTamperedRejected);
  } catch (err: any) {
    assert("AEAD tamper detection threw error", false, err.message);
  }

  // 4. Secret Sanitization & Masking
  try {
    const sensitive = {
      clientId: "client_pub_id",
      clientSecret: "very_long_secret_string_12345",
      apiKey: "key_abc",
      safeOption: "enabled",
    };

    const sanitized = LMSCryptoService.sanitizeCredentials(sensitive);
    assert("Sanitization leaves safe non-secret fields intact", sanitized.safeOption === "enabled");
    assert("Sanitization leaves clientId unmasked", sanitized.clientId === "client_pub_id");
    assert("Sanitization masks clientSecret", typeof sanitized.clientSecret === "string" && sanitized.clientSecret.includes("..."));
    assert("Sanitization masks short apiKey", sanitized.apiKey === "********");
  } catch (err: any) {
    assert("Credential sanitization threw error", false, err.message);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  return { passed, failed, results };
}
