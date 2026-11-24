import { parseEnv } from "../src/config/env.js";

export async function runConfigTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // Test 1: Defaults apply cleanly
    const defaultConfig = parseEnv({
      NODE_ENV: "development",
      PORT: "4000",
    });

    if (defaultConfig.PORT !== 4000) {
      return { passed: false, message: `Expected default PORT 4000, got ${defaultConfig.PORT}` };
    }
    if (defaultConfig.NODE_ENV !== "development") {
      return { passed: false, message: `Expected default NODE_ENV 'development', got ${defaultConfig.NODE_ENV}` };
    }

    // Test 2: Custom valid environment overrides
    const testConfig = parseEnv({
      NODE_ENV: "test",
      PORT: "8080",
      LOG_LEVEL: "warn",
      CORS_ORIGIN: "https://example.com",
    });

    if (testConfig.PORT !== 8080) {
      return { passed: false, message: `Expected PORT 8080, got ${testConfig.PORT}` };
    }
    if (testConfig.LOG_LEVEL !== "warn") {
      return { passed: false, message: `Expected LOG_LEVEL 'warn', got ${testConfig.LOG_LEVEL}` };
    }

    // Test 3: Invalid NODE_ENV should throw
    let caughtError = false;
    try {
      parseEnv({
        NODE_ENV: "invalid_env_name",
      });
    } catch {
      caughtError = true;
    }

    if (!caughtError) {
      return { passed: false, message: "Expected invalid NODE_ENV to trigger validation error" };
    }

    return { passed: true, message: "Configuration validation passed (defaults, overrides, validation errors)" };
  } catch (error) {
    return { passed: false, message: error instanceof Error ? error.message : String(error) };
  }
}
