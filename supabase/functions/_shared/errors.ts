// Centralized error handling for edge functions
// Maps internal errors to safe user-facing messages

export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  DOMAIN_NOT_CONFIGURED: 'DOMAIN_NOT_CONFIGURED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

const errorMessages: Record<ErrorCode, string> = {
  INVALID_INPUT: 'The provided input is invalid. Please check your request.',
  DOMAIN_NOT_CONFIGURED: 'This domain is not available. Please contact support.',
  PAYMENT_FAILED: 'Payment verification failed. Please try again.',
  DATABASE_ERROR: 'Service temporarily unavailable. Please try again later.',
  EXTERNAL_API_ERROR: 'External service unavailable. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This resource already exists.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please contact support.',
};

export interface SafeError {
  code: ErrorCode;
  message: string;
}

// Convert any error to a safe user-facing error
export function toSafeError(error: unknown, code: ErrorCode = ErrorCodes.INTERNAL_ERROR): SafeError {
  // Log the actual error server-side for debugging
  console.error('[ERROR]', code, error);
  
  return {
    code,
    message: errorMessages[code],
  };
}

// Helper to create error responses
export function errorResponse(error: SafeError, status: number = 500): Response {
  return new Response(
    JSON.stringify(error),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
