import * as Sentry from '@sentry/react';
import type { Scope } from '@sentry/core';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
    if (!SENTRY_DSN) {
        console.warn('Sentry DSN not configured. Error tracking disabled.');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        
        // Performance monitoring
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        
        // Session replay for debugging user issues
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // Release tracking
        release: import.meta.env.VITE_APP_VERSION || '1.0.0',
        
        // Enable debug mode in development
        debug: import.meta.env.DEV,
        
        // Filter out common non-actionable errors
        beforeSend(event) {
            // Ignore specific errors that are not actionable
            const ignoreErrors = [
                'ResizeObserver loop limit exceeded',
                'Network request failed',
                'Failed to fetch',
                'AbortError: The user aborted a request',
            ];
            
            const errorMessage = event.exception?.values?.[0]?.value || '';
            if (ignoreErrors.some(err => errorMessage.includes(err))) {
                return null;
            }
            
            return event;
        },
        
        // Attach user context (will be set after login)
        initialScope: {
            tags: {
                app: 'expiry-management',
            },
        },
    });

    console.log(`Sentry initialized in ${ENVIRONMENT} mode`);
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
        });
    } else {
        Sentry.setUser(null);
    }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
    message: string,
    category?: string,
    level: Sentry.SeverityLevel = 'info',
    data?: Record<string, any>
) {
    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000,
    });
}

/**
 * Capture exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>) {
    Sentry.withScope((scope: Scope) => {
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
        }
        Sentry.captureException(error);
    });
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
}

/**
 * Set tag for filtering
 */
export function setTag(key: string, value: string) {
    Sentry.setTag(key, value);
}

// Re-export Sentry for direct access if needed
export { Sentry };
