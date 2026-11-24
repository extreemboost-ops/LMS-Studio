export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown, errorCode = "BAD_REQUEST"): AppError {
    return new AppError(400, errorCode, message, details);
  }

  static unauthorized(message = "Authentication required", errorCode = "UNAUTHORIZED"): AppError {
    return new AppError(401, errorCode, message);
  }

  static forbidden(message = "Access denied", errorCode = "FORBIDDEN"): AppError {
    return new AppError(403, errorCode, message);
  }

  static notFound(resource = "Resource", errorCode = "NOT_FOUND"): AppError {
    return new AppError(404, errorCode, `${resource} not found`);
  }

  static conflict(message: string, errorCode = "CONFLICT"): AppError {
    return new AppError(409, errorCode, message);
  }

  static unprocessable(message: string, details?: unknown, errorCode = "VALIDATION_FAILED"): AppError {
    return new AppError(422, errorCode, message, details);
  }

  static internal(message = "Internal server error", errorCode = "INTERNAL_SERVER_ERROR"): AppError {
    return new AppError(500, errorCode, message, undefined, false);
  }
}
