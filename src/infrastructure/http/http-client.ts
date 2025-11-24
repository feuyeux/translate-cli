/**
 * HTTP Client Module
 *
 * This module provides a robust HTTP client with retry logic, timeout handling,
 * and comprehensive error conversion for translation service requests.
 *
 * Key Features:
 * - Automatic retry with exponential backoff for transient failures
 * - Configurable timeout and retry settings
 * - Proxy support for network environments requiring proxies
 * - Detailed error classification and user-friendly error messages
 * - Distinguishes between retryable and non-retryable errors
 *
 * @module http-client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HTTPError } from '../errors/http-error';

/**
 * Configuration options for HTTP client
 *
 * @property timeout - Request timeout in milliseconds (default: 10000)
 * @property retries - Maximum number of retry attempts (default: 3)
 * @property proxy - Proxy server URL (e.g., 'http://proxy.example.com:8080')
 */
export interface HTTPOptions {
  timeout?: number;
  retries?: number;
  proxy?: string;
}

export class HTTPClient {
  private client: AxiosInstance;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(options?: HTTPOptions) {
    this.defaultTimeout = options?.timeout || 10000;
    this.defaultRetries = options?.retries || 3;

    const axiosConfig = {
      timeout: this.defaultTimeout,
      maxRedirects: 5, // Follow redirects
      validateStatus: (status: number) => status >= 200 && status < 300, // Only accept 2xx as success
      httpsAgent: undefined as HttpsProxyAgent<string> | undefined,
      proxy: false as const,
    };

    // Configure proxy if provided
    if (options?.proxy) {
      const proxyUrl = options.proxy.startsWith('http') ? options.proxy : `http://${options.proxy}`;
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    this.client = axios.create(axiosConfig);
  }

  /**
   * Perform GET request with automatic retry logic
   *
   * @param url - URL to request
   * @param options - Optional request configuration (timeout, retries)
   * @returns Response body as string
   * @throws HTTPError with detailed error information if request fails after all retries
   */
  async get(url: string, options?: HTTPOptions): Promise<string> {
    return this.requestWithRetry('GET', url, undefined, options);
  }

  /**
   * Perform POST request with automatic retry logic
   *
   * @param url - URL to request
   * @param data - Request body data
   * @param options - Optional request configuration (timeout, retries)
   * @param headers - Optional custom headers
   * @returns Response body as string
   * @throws HTTPError with detailed error information if request fails after all retries
   */

  async post(
    url: string,
    data: unknown,
    options?: HTTPOptions,
    headers?: Record<string, string>
  ): Promise<string> {
    return this.requestWithRetry('POST', url, data, options, headers);
  }

  /**
   * Execute HTTP request with exponential backoff retry logic
   *
   * Retry Strategy:
   * - Retries only on transient failures (network errors, 5xx, 429)
   * - Uses exponential backoff: 2^attempt * 100ms (100ms, 200ms, 400ms, ...)
   * - Stops retrying on non-retryable errors (4xx except 429)
   *
   * @param method - HTTP method ('GET' or 'POST')
   * @param url - URL to request
   * @param data - Request body data (for POST requests)
   * @param options - Optional request configuration
   * @param headers - Optional custom headers
   * @returns Response body as string
   * @throws HTTPError after all retries are exhausted
   * @private
   */
  private async requestWithRetry(
    method: 'GET' | 'POST',
    url: string,
    data?: unknown,
    options?: HTTPOptions,
    headers?: Record<string, string>
  ): Promise<string> {
    const timeout = options?.timeout || this.defaultTimeout;
    const maxRetries = options?.retries !== undefined ? options.retries : this.defaultRetries;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response =
          method === 'GET'
            ? await this.client.get(url, { timeout, headers })
            : await this.client.post(url, data, { timeout, headers });

        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        // Calculate exponential backoff delay: 2^attempt * 100ms
        const delay = Math.pow(2, attempt) * 100;
        await this.sleep(delay);
      }
    }

    // All retries exhausted, throw converted error
    throw this.convertError(lastError!);
  }

  /**
   * Determine if an error is retryable
   *
   * Retryable errors include:
   * - Network errors (no response received)
   * - HTTP 5xx server errors (500, 502, 503, 504)
   * - HTTP 429 rate limiting
   *
   * Non-retryable errors include:
   * - HTTP 4xx client errors (except 429)
   * - Non-axios errors
   *
   * @param error - Error object to evaluate
   * @returns true if the error should trigger a retry, false otherwise
   * @private
   */
  private isRetryableError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const axiosError = error as AxiosError;

    // Retry on network errors (no response)
    if (!axiosError.response) {
      return true;
    }

    // Retry on 5xx server errors and 429 (rate limit)
    const status = axiosError.response.status;
    return status >= 500 || status === 429;
  }

  /**
   * Convert axios errors to HTTPError with meaningful messages
   *
   * This method categorizes errors and provides user-friendly messages:
   *
   * Network Errors (no statusCode):
   * - ECONNABORTED / timeout: "翻译请求超时"
   * - ENOTFOUND / EAI_AGAIN: "无法解析翻译服务地址"
   * - Other network errors: "无法连接到翻译服务"
   *
   * HTTP Status Errors (with statusCode):
   * - 400: "无效的翻译请求"
   * - 429: "请求过于频繁，请稍后重试"
   * - 500/502/503/504: "翻译服务暂时不可用"
   * - Other: "翻译失败：{statusCode}"
   *
   * @param error - Original error from axios
   * @returns HTTPError with user-friendly message and structured error information
   * @private
   */
  private convertError(error: Error): HTTPError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Timeout error
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return new HTTPError('翻译请求超时', undefined, error);
      }

      // Network errors (no response)
      if (!axiosError.response) {
        if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'EAI_AGAIN') {
          return new HTTPError('无法解析翻译服务地址', undefined, error);
        }
        return new HTTPError('无法连接到翻译服务', undefined, error);
      }

      // HTTP status errors
      const status = axiosError.response.status;
      switch (status) {
        case 400:
          return new HTTPError('无效的翻译请求', status, error);
        case 429:
          return new HTTPError('请求过于频繁，请稍后重试', status, error);
        case 500:
        case 502:
        case 503:
        case 504:
          return new HTTPError('翻译服务暂时不可用', status, error);
        default:
          return new HTTPError(`翻译失败：${status}`, status, error);
      }
    }

    // Unknown error
    return new HTTPError('未知错误', undefined, error);
  }

  /**
   * Sleep utility for implementing retry delays
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
