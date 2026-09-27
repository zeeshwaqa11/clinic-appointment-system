export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION_ERROR", message, details);
}

export function unauthorizedError(message = "Authentication required"): AppError {
  return new AppError("UNAUTHORIZED", message);
}

export function forbiddenError(message = "You do not have access to this resource"): AppError {
  return new AppError("FORBIDDEN", message);
}

export function notFoundError(message: string): AppError {
  return new AppError("NOT_FOUND", message);
}

export function conflictError(message: string, details?: unknown): AppError {
  return new AppError("CONFLICT", message, details);
}

export function unprocessableError(message: string, details?: unknown): AppError {
  return new AppError("UNPROCESSABLE", message, details);
}
