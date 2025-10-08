/**
 * Utility functions for generating frontend URLs
 */

/**
 * Get the base frontend URL based on environment
 * In production, always use the hardcoded portal URL
 * In development, use FRONTEND_URL or fallback to localhost
 */
export function getFrontendBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://portal.planettalk.com';
  }
  
  return process.env.FRONTEND_URL || 'http://localhost:3001';
}

/**
 * Get the frontend URL with /en path
 */
export function getFrontendUrl(): string {
  return `${getFrontendBaseUrl()}/en`;
}

/**
 * Get the dashboard URL
 */
export function getDashboardUrl(): string {
  return `${getFrontendUrl()}/dashboard`;
}

/**
 * Get the password reset URL with token
 */
export function getPasswordResetUrl(token: string): string {
  return `${getFrontendUrl()}/auth/reset-password?token=${token}`;
}

/**
 * Get the email verification URL
 */
export function getEmailVerificationUrl(): string {
  return `${getFrontendUrl()}/verify-email`;
}

/**
 * Get the login URL
 */
export function getLoginUrl(): string {
  return getFrontendUrl();
}
