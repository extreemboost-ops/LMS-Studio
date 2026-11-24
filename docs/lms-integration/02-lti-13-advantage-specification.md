# 02 — LTI 1.3 Advantage Protocol & OIDC Specification

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services  
**Standard:** 1EdTech Learning Tools Interoperability (LTI) 1.3 Core & Advantage  

---

## 1. OIDC 3rd Party Initiation Flow

```
[ LMS Platform (Canvas/Moodle) ]                      [ Studio LTI Service ]
               │                                                │
               │ 1. GET /login_initiations?iss=...&login_hint=..│
               │───────────────────────────────────────────────►│
               │                                                │ Validates iss, client_id
               │                                                │ Generates state & nonce
               │ 2. 302 Redirect to Platform Authorization URL  │
               │◄───────────────────────────────────────────────│
               │                                                │
               │ 3. User approves in LMS (prompt=none)          │
               │                                                │
               │ 4. POST /launch (id_token, state)              │
               │───────────────────────────────────────────────►│
               │                                                │ Validates RS256 signature
               │                                                │ Decodes LTI 1.3 claims
               │                                                │ Provisions Learner
               │ 5. Render Course Content Player                │
               │◄───────────────────────────────────────────────│
```

### Protocol Details:
- **Initiation Endpoint:** `GET /api/v1/lti/1.3/login_initiations` and `POST /api/v1/lti/1.3/login_initiations`
- **Mandatory Query / Form Parameters:**
  - `iss`: Platform issuer identifier (e.g. `https://canvas.instructure.com`)
  - `login_hint`: User identifier within the LMS
  - `target_link_uri`: Tool launch URL
  - `client_id`: OAuth2 client ID registered for the tool

---

## 2. Mandatory LTI 1.3 Claims Handled

| Claim URI | Required | Description | Internal Mapping |
|:---|:---:|:---|:---|
| `https://purl.imsglobal.org/spec/lti/claim/message_type` | Yes | Must be `"LtiResourceLinkRequest"` or `"LtiDeepLinkingRequest"` | Route dispatcher |
| `https://purl.imsglobal.org/spec/lti/claim/version` | Yes | Must be `"1.3.0"` | Protocol version check |
| `https://purl.imsglobal.org/spec/lti/claim/roles` | Yes | Array of IMS LIS role URIs | Role determination (`isInstructor`) |
| `https://purl.imsglobal.org/spec/lti/claim/resource_link` | Yes | Object containing `id`, `title`, `description` | Mapped to `LMSDeployment.externalActivityId` |
| `https://purl.imsglobal.org/spec/lti/claim/context` | No | Object containing `id`, `title`, `label` | Mapped to LMS Course ID |
| `https://purl.imsglobal.org/spec/lti/claim/target_link_uri` | Yes | Launch destination | Route redirection |

---

## 3. Asymmetric RSA JWKS Keyset Endpoint

The platform exposes its public cryptographic keys via:
- **Endpoint:** `GET /api/v1/lti/1.3/jwks`
- **Specification:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "key-37910a",
      "n": "uBv37...89aQ",
      "e": "AQAB"
    }
  ]
}
```
LMS platforms consume this endpoint to verify JWTs issued by the Studio tool for **Assignment and Grade Services (AGS)** and **Deep Linking responses**.
