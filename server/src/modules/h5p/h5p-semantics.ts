export interface H5PSemanticsField {
  name: string;
  type: "text" | "number" | "boolean" | "group" | "list" | "select" | "library" | "image" | "video" | "audio";
  label?: string;
  description?: string;
  optional?: boolean;
  default?: unknown;
  maxLength?: number;
  widget?: string;
  fields?: H5PSemanticsField[];
  field?: H5PSemanticsField;
  options?: Array<{ value: string | number; label: string }>;
}

export interface SemanticsValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
  filteredParameters: Record<string, unknown>;
}

/**
 * Sanitizes HTML strings, stripping malicious script tags, event handlers, and javascript: links
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  return html
    // Strip <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip <iframe / object / embed>
    .replace(/<\/?(iframe|object|embed|applet)\b[^>]*>/gi, "")
    // Strip dangerous attributes (onload, onerror, onclick, onmouseover, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    // Strip javascript: hrefs
    .replace(/href\s*=\s*(?:['"]\s*javascript:[^'"]*['"]|javascript:[^\s>]+)/gi, 'href="#"');
}

/**
 * Validates content parameters against an H5P semantics.json schema
 * and produces a safe, sanitized filteredParameters object.
 */
export class H5PSemanticsValidator {
  static validate(
    semantics: H5PSemanticsField[] | undefined,
    parameters: Record<string, unknown> | undefined
  ): SemanticsValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    if (!semantics || !Array.isArray(semantics) || semantics.length === 0) {
      // If semantics are not provided, return parameters sanitized generically
      const filtered = this.deepSanitizeObject(parameters || {});
      return { isValid: true, errors: [], filteredParameters: filtered };
    }

    const raw = parameters || {};
    const filteredParameters: Record<string, unknown> = {};

    for (const field of semantics) {
      const fieldName = field.name;
      const val = raw[fieldName];

      // Check required
      if (val === undefined || val === null) {
        if (!field.optional && field.default === undefined) {
          errors.push({ field: fieldName, message: `Field '${fieldName}' is required` });
        } else if (field.default !== undefined) {
          filteredParameters[fieldName] = field.default;
        }
        continue;
      }

      const res = this.validateField(field, val, fieldName);
      if (res.error) {
        errors.push({ field: fieldName, message: res.error });
      } else {
        filteredParameters[fieldName] = res.sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      filteredParameters,
    };
  }

  private static validateField(
    field: H5PSemanticsField,
    value: unknown,
    path: string
  ): { sanitizedValue: unknown; error?: string } {
    switch (field.type) {
      case "text": {
        if (typeof value !== "string") {
          return { sanitizedValue: String(value), error: `Expected string at '${path}'` };
        }
        if (field.maxLength && value.length > field.maxLength) {
          return {
            sanitizedValue: value.substring(0, field.maxLength),
            error: `String at '${path}' exceeds maximum length of ${field.maxLength}`,
          };
        }
        return { sanitizedValue: sanitizeHtml(value) };
      }

      case "number": {
        const num = Number(value);
        if (isNaN(num)) {
          return { sanitizedValue: 0, error: `Expected number at '${path}'` };
        }
        return { sanitizedValue: num };
      }

      case "boolean": {
        return { sanitizedValue: Boolean(value) };
      }

      case "select": {
        if (field.options && !field.options.some((opt) => opt.value === value)) {
          return {
            sanitizedValue: value,
            error: `Value '${value}' is not a valid option for select at '${path}'`,
          };
        }
        return { sanitizedValue: value };
      }

      case "group": {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return { sanitizedValue: {}, error: `Expected object at '${path}'` };
        }
        const groupObj = value as Record<string, unknown>;
        const sanitizedGroup: Record<string, unknown> = {};

        if (field.fields && Array.isArray(field.fields)) {
          for (const subField of field.fields) {
            const subVal = groupObj[subField.name];
            if (subVal !== undefined) {
              const res = this.validateField(subField, subVal, `${path}.${subField.name}`);
              sanitizedGroup[subField.name] = res.sanitizedValue;
            } else if (subField.default !== undefined) {
              sanitizedGroup[subField.name] = subField.default;
            }
          }
        }
        return { sanitizedValue: sanitizedGroup };
      }

      case "list": {
        if (!Array.isArray(value)) {
          return { sanitizedValue: [], error: `Expected array at '${path}'` };
        }
        const sanitizedList: unknown[] = [];
        if (field.field) {
          for (let i = 0; i < value.length; i++) {
            const itemRes = this.validateField(field.field, value[i], `${path}[${i}]`);
            sanitizedList.push(itemRes.sanitizedValue);
          }
        } else {
          for (const item of value) {
            sanitizedList.push(typeof item === "string" ? sanitizeHtml(item) : item);
          }
        }
        return { sanitizedValue: sanitizedList };
      }

      case "library":
      case "image":
      case "video":
      case "audio":
      default: {
        if (typeof value === "object" && value !== null) {
          return { sanitizedValue: this.deepSanitizeObject(value as Record<string, unknown>) };
        }
        return { sanitizedValue: typeof value === "string" ? sanitizeHtml(value) : value };
      }
    }
  }

  private static deepSanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") {
        sanitized[k] = sanitizeHtml(v);
      } else if (Array.isArray(v)) {
        sanitized[k] = v.map((item) =>
          typeof item === "string"
            ? sanitizeHtml(item)
            : typeof item === "object" && item !== null
            ? this.deepSanitizeObject(item as Record<string, unknown>)
            : item
        );
      } else if (typeof v === "object" && v !== null) {
        sanitized[k] = this.deepSanitizeObject(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
