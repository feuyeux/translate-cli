/**
 * HTTP Error Module
 *
 * This module defines custom error classes for HTTP-related errors.
 * These errors are used by the HTTP client to provide structured error information
 * that can be processed by translation engines for user-friendly error messages.
 *
 * @module http-error
 */

/**
 * Custom error class for HTTP-related errors
 *
 * This error class is used by the HTTP client to provide structured error information
 * that can be processed by translation engines for user-friendly error messages.
 *
 * @property message - User-friendly error description
 * @property statusCode - HTTP status code if available (undefined for network errors)
 * @property originalError - Original error object from axios for debugging
 *
 * Error Categories:
 * - Network errors: No statusCode (timeout, connection failure, DNS resolution)
 * - HTTP errors: Has statusCode (429 rate limit, 5xx server errors, etc.)
 */
export class HTTPError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'HTTPError';
  }
}
