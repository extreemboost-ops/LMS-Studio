export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Production-ready API Client supporting real HTTP requests, JWT token attachment,
 * credentials transport (HttpOnly cookies), and resilient fallback to mock data.
 */
export class ApiClient {
  private static token: string | null = null;
  private static organizationId: string | null = null;
  private static baseUrl = "/api/v1";

  static setToken(token: string | null): void {
    this.token = token;
    if (token) {
      try {
        sessionStorage.setItem("scorm_access_token", token);
      } catch {}
    } else {
      try {
        sessionStorage.removeItem("scorm_access_token");
      } catch {}
    }
  }

  static getToken(): string | null {
    if (!this.token) {
      try {
        this.token = sessionStorage.getItem("scorm_access_token");
      } catch {}
    }
    return this.token;
  }

  static setOrganizationId(orgId: string | null): void {
    this.organizationId = orgId;
    if (orgId) {
      try {
        sessionStorage.setItem("scorm_active_org", orgId);
      } catch {}
    } else {
      try {
        sessionStorage.removeItem("scorm_active_org");
      } catch {}
    }
  }

  static getOrganizationId(): string | null {
    if (!this.organizationId) {
      try {
        this.organizationId = sessionStorage.getItem("scorm_active_org");
      } catch {}
    }
    return this.organizationId;
  }

  private static buildHeaders(customHeaders: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const orgId = this.getOrganizationId();
    if (orgId) {
      headers["X-Organization-Id"] = orgId;
    }

    return headers;
  }

  static async get<T>(endpoint: string, mockFallback?: T): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: this.buildHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        if (mockFallback !== undefined && res.status >= 500) {
          return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
        }
        const errorData = await res.json().catch(() => ({}));
        throw {
          status: res.status,
          message: errorData.error?.message || `Request failed with status ${res.status}`,
          code: errorData.error?.code,
          details: errorData.error?.details,
        } as ApiError;
      }

      return await res.json();
    } catch (err) {
      if (mockFallback !== undefined) {
        return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
      }
      throw err;
    }
  }

  static async post<T, B = unknown>(endpoint: string, body: B, mockFallback?: T): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        if (mockFallback !== undefined && res.status >= 500) {
          return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
        }
        const errorData = await res.json().catch(() => ({}));
        throw {
          status: res.status,
          message: errorData.error?.message || `Request failed with status ${res.status}`,
          code: errorData.error?.code,
          details: errorData.error?.details,
        } as ApiError;
      }

      return await res.json();
    } catch (err) {
      if (mockFallback !== undefined) {
        return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
      }
      throw err;
    }
  }

  static async put<T, B = unknown>(endpoint: string, body: B, mockFallback?: T): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        if (mockFallback !== undefined && res.status >= 500) {
          return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
        }
        const errorData = await res.json().catch(() => ({}));
        throw {
          status: res.status,
          message: errorData.error?.message || `Request failed with status ${res.status}`,
          code: errorData.error?.code,
        } as ApiError;
      }

      return await res.json();
    } catch (err) {
      if (mockFallback !== undefined) {
        return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
      }
      throw err;
    }
  }

  static async delete<T>(endpoint: string, mockFallback?: T): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: this.buildHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        if (mockFallback !== undefined && res.status >= 500) {
          return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
        }
        const errorData = await res.json().catch(() => ({}));
        throw {
          status: res.status,
          message: errorData.error?.message || `Request failed with status ${res.status}`,
          code: errorData.error?.code,
        } as ApiError;
      }

      return await res.json();
    } catch (err) {
      if (mockFallback !== undefined) {
        return { success: true, data: mockFallback, timestamp: new Date().toISOString() };
      }
      throw err;
    }
  }
}
