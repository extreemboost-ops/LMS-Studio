# H5P Semantics Parser & HTML Sanitization

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Semantics Specification

Every H5P library includes a `semantics.json` schema describing the data model expected by its runtime player and authoring widgets.

### 1.1 Supported Field Types (`H5PSemanticsValidator`)

| Field Type | Schema Representation | Validation & Sanitization Behavior |
| :--- | :--- | :--- |
| `text` | String primitive | Validates `maxLength`, sanitizes HTML, strips script tags |
| `number` | Numeric primitive | Enforces `!isNaN(Number(val))`, coerces to numeric float |
| `boolean` | Boolean primitive | Enforces boolean truth value |
| `select` | Enumerated option | Validates that value matches one of declared `options` |
| `group` | Object dictionary | Recursively validates nested child `fields` |
| `list` | Sequential array | Recursively validates repeated child `field` definition |
| `library` | Sub-library interaction | Validates library string identifier (e.g. `H5P.MultiChoice 1.16`) |
| `image` / `video` | Media asset object | Sanitizes media paths, mime types, and alt text |

---

## 2. Defensive HTML & XSS Sanitization

In e-learning environments, untrusted user input can compromise student sessions or steal session cookies if rendered raw in an LMS. The engine implements strict HTML sanitization via `sanitizeHtml`:

1. **Script Tag Neutralization:** Strips all `<script>...</script>` tags entirely.
2. **Frame & Object Removal:** Strips `<iframe>`, `<object>`, `<embed>`, and `<applet>` tags.
3. **Event Handler Stripping:** Regex-neutralizes inline event handlers (`onclick=`, `onerror=`, `onload=`, `onmouseover=`).
4. **Dangerous URI Neutralization:** Neutralizes pseudo-protocols in links (`href="javascript:..."` -> `href="#"`).
5. **Safe Markup Preservation:** Preserves standard educational styling (`<b>`, `<i>`, `<u>`, `<p>`, `<span>`, `<ul>`, `<li>`, `<table>`).

---

## 3. Parameter Pipeline

```
[Author Input Canvas]
         |
         v
+-------------------------------------------------------------+
| raw parameters (Stored as-is for lossless author re-editing)|
+-------------------------------------------------------------+
         |
         |--> Passed through H5PSemanticsValidator.validate()
         |
         v
+-------------------------------------------------------------+
| filteredParameters (Sanitized, script-safe, validated JSON) |
| Delivered to learner players and SCORM packages             |
+-------------------------------------------------------------+
```
