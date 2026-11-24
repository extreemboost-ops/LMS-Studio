export interface StandardMeta {
  requestId: string;
  timestamp: string;
  durationMs?: number;
}

export interface StandardError {
  code: string;
  message: string;
  details?: unknown;
}

export interface StandardApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: StandardError;
  meta: StandardMeta;
}

export interface DatabaseHealthResult {
  status: "UP" | "DOWN" | "DEGRADED";
  latencyMs: number;
  database: string;
  timestamp: string;
  error?: string;
}

export interface SystemHealthResult {
  status: "OK" | "WARNING" | "CRITICAL";
  version: string;
  uptimeSeconds: number;
  environment: string;
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  timestamp: string;
}

export interface ReadinessResult {
  ready: boolean;
  checks: {
    database: "UP" | "DOWN";
    configuration: "UP" | "DOWN";
  };
  timestamp: string;
}
