/**
 * Error Reporting Stub
 *
 * This module centralizes error reporting for the application.
 * Currently configured as a stub that logs to console.
 *
 * To integrate with Sentry:
 * 1. npm install @sentry/react
 * 2. Replace the stub with:
 *    import * as Sentry from "@sentry/react";
 *    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... });
 *    export const captureError = Sentry.captureException;
 *    export const captureMessage = Sentry.captureMessage;
 */

export interface ErrorContext {
  component?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

/**
 * Capture an unexpected error. In production, send to monitoring service.
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (import.meta.env.DEV) {
    console.error("[ErrorReporting]", message, { context, stack });
  } else {
    // TODO: Replace with Sentry.captureException(error, { extra: context });
    console.error("[ErrorReporting]", message, context);
  }
}

/**
 * Capture a custom message/warning.
 */
export function captureMessage(message: string, context?: ErrorContext): void {
  if (import.meta.env.DEV) {
    console.warn("[ErrorReporting]", message, context);
  }
  // TODO: Replace with Sentry.captureMessage(message, { extra: context });
}
