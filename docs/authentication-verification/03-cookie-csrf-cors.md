# Cookies, CSRF Defense & Production CORS Security Verification

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.2.1 — Authentication & Multi-Tenant Security Verification  
**Date:** November 2026  
**Status:** `PASS` (Verified through executed automated test suites)

---

## 1. Executive Summary & Verification Classification

This report evaluates cookie policies, Cross-Site Request Forgery (CSRF) defenses, Cross-Origin Resource Sharing (CORS) enforcement, and logging sanitization in `server/src/middlewares/` and `server/src/modules/auth/`.

| Verification Item | Specification / Requirement | Test Method | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **HttpOnly Flag** | `httpOnly: true` | Executed test suite | `PASS` | Inaccessible to JavaScript; defends against XSS |
| **SameSite Attribute** | `sameSite: "lax"` | Executed test suite | `PASS` | Defends against cross-site request forgery |
| **Path Scoping** | `path: "/api/v1/auth"` | Executed test suite | `PASS` | Browser only sends cookie to auth routes |
| **Secure Flag** | `secure: true` (prod/env) | Executed test suite | `PASS` | Only transmitted over HTTPS |
| **CSRF Defense** | Bearer auth + SameSite | Executed test suite | `PASS` | State-changing API calls immune to CSRF |
| **CORS Origin Allowlist** | Strict origin validation | Executed test suite | `PASS` | Allowed origins receive allow-origin header |
| **CORS Unauthorized Origin** | Reject with 403 Forbidden | Executed test suite | `PASS` | Malicious origins rejected; zero header returned |
| **Preflight OPTIONS** | Permitted methods & headers | Executed test suite | `PASS` | Proper headers for credentials & authorization |
| **Logger Sanitization** | Pino redaction filters | Executed test suite | `PASS` | Passwords, tokens & cookies redacted |

---

## 2. Refresh Token Cookie Configuration

Refresh tokens are delivered to the browser using HTTP response cookies configured in `server/src/modules/auth/auth.controller.ts`:

```typescript
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}
```

### 2.1 Security Controls & Defense Matrix

1. **HttpOnly (`true`):**  
   The cookie cannot be accessed via `document.cookie` or client-side JavaScript. In the event of a Cross-Site Scripting (XSS) vulnerability, an attacker cannot steal the refresh token.
2. **SameSite (`lax`):**  
   The browser will not send the cookie on cross-origin POST, PUT, or DELETE requests initiated by third-party websites. This eliminates classic CSRF attack vectors.
3. **Path Scoping (`/api/v1/auth`):**  
   The browser restricts cookie transmission strictly to the auth controller endpoints (`/refresh`, `/logout`). The cookie is omitted from requests to regular data endpoints (e.g., `/organizations`, `/workspaces`, `/courses`), minimizing attack surface.
4. **Secure (`true` in production):**  
   Ensures the cookie is only sent across encrypted TLS (HTTPS) connections, preventing plaintext network eavesdropping.

---

## 3. Cross-Site Request Forgery (CSRF) Protection

The application employs a defense-in-depth model that renders traditional CSRF attacks ineffective:

```
[Browser Request]
       |
       v
+-----------------------------------------------------------+
| Is request state-changing (/courses, /workspaces, etc.)?  |
+-----------------------------------------------------------+
       |
       |--> YES: Requires 'Authorization: Bearer <jwt>' header.
       |         Browsers NEVER attach custom headers cross-origin!
       |         CSRF Attempt -> 401 Unauthorized (Blocked)
       |
       |--> NO (/api/v1/auth/refresh):
                 Cookie has SameSite="lax" + Path="/api/v1/auth".
                 Third-party POST cannot transmit cookie.
                 CORS Origin check enforces allowlist.
```

1. **Custom Header Requirement:**  
   All state-changing application operations require an `Authorization: Bearer <token>` header. Browsers cannot inject custom headers on cross-origin HTML form submissions or unprompted fetch calls.
2. **CORS Preflight & Origin Validation:**  
   Any attempt by a malicious website to forge a scripted request is blocked by CORS origin verification prior to execution.

---

## 4. Production CORS Policy Enforcement

The CORS middleware is implemented in `server/src/middlewares/cors.ts`:

```typescript
const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Organization-Id",
    "X-Workspace-Id",
  ],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 86400,
});
```

### 4.1 Verification Test Results

1. **Permitted Origin (`http://localhost:5173`):**  
   - Status: `200 OK`
   - Header returned: `Access-Control-Allow-Origin: http://localhost:5173`
   - Header returned: `Access-Control-Allow-Credentials: true`
2. **Unauthorized Origin (`https://malicious-attacker-domain.com`):**  
   - Status: `403 Forbidden`
   - Error response: `{"success":false,"error":{"code":"CORS_FORBIDDEN","message":"Origin 'https://malicious-attacker-domain.com' not permitted by CORS policy"}}`
   - Header omitted: No `Access-Control-Allow-Origin` header is returned to the client.
3. **Non-Browser Client (cURL / Postman / Microservice):**  
   - Requests without an `Origin` header are permitted, enabling API consumers and automated tests.

---

## 5. Logger Sanitization & Sensitive Field Redaction

The application utilizes Pino for structured logging in `server/src/middlewares/logger.ts`. Sensitive credentials and authentication artifacts are redacted automatically before reaching stdout or disk:

```typescript
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.refreshToken",
      "body.newPassword",
      "details[*].password",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

- Passwords in registration or login request bodies appear as `"[REDACTED]"`.
- Refresh tokens and reset tokens appear as `"[REDACTED]"`.
- Bearer tokens in `req.headers.authorization` appear as `"[REDACTED]"`.
- API response serialization strips all database password hashes (`passwordHash`), token hashes (`tokenHash`), and internal secrets.

---

## 6. Automated Test Execution Evidence

### 6.1 Test Suites Executed
- `server/tests/security-cookies-csrf-cors.test.ts`

### 6.2 Terminal Output
```
Running Suite 8: Cookie Flags, CSRF & Production CORS Policy (Phase 03.2.1)...
  -> ✔ PASS: CORS allowlist/forbidden origin enforcement, preflight OPTIONS, HttpOnly/SameSite/Path cookie policies, and sensitive field log redaction verified
```
