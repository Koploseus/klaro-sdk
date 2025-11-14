import { Request, Response, NextFunction } from 'express';
import { KlaroClient } from '../utils/client';
import { Batcher } from '../utils/batcher';

export interface KlaroMiddlewareConfig {
  /**
   * Your Klaro API key
   */
  apiKey: string;

  /**
   * Function to extract customer ID from request
   * @example (req) => req.user?.id
   */
  getCustomerId: (req: Request) => string | undefined;

  /**
   * Klaro API URL (optional, defaults to production)
   */
  apiUrl?: string;

  /**
   * Enable batching (default: true)
   */
  enableBatching?: boolean;

  /**
   * Max batch size (default: 10)
   */
  maxBatchSize?: number;

  /**
   * Flush interval in ms (default: 5000)
   */
  flushInterval?: number;

  /**
   * Capture request headers (default: false)
   */
  captureHeaders?: boolean;

  /**
   * Capture query parameters (default: true)
   */
  captureQuery?: boolean;

  /**
   * Skip certain paths (e.g., health checks)
   */
  skipPaths?: string[];
}

/**
 * Express middleware for Klaro API monitoring
 * 
 * @example
 * ```typescript
 * import { klaroMiddleware } from '@klaro/sdk';
 * 
 * app.use(klaroMiddleware({
 *   apiKey: 'klaro_abc123',
 *   getCustomerId: (req) => req.user?.id
 * }));
 * ```
 */
export function klaroMiddleware(config: KlaroMiddlewareConfig) {
  const client = new KlaroClient({
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
  });

  const batcher = config.enableBatching !== false
    ? new Batcher(client, {
        maxBatchSize: config.maxBatchSize,
        flushInterval: config.flushInterval,
      })
    : null;

  // Graceful shutdown
  if (batcher) {
    process.on('SIGTERM', () => batcher.stop());
    process.on('SIGINT', () => batcher.stop());
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if path is in skipPaths
    if (config.skipPaths?.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      res.send = originalSend;

      // Calculate duration
      const duration = Date.now() - startTime;

      // Extract customer ID
      const customerId = config.getCustomerId(req);

      // Only track if we have a customer ID
      if (customerId) {
        const requestData = {
          customerId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          timestamp: new Date().toISOString(),
          ...(config.captureHeaders && { headers: req.headers as Record<string, string> }),
          ...(config.captureQuery !== false && { query: req.query }),
        };

        // Send to Klaro (async, don't wait)
        if (batcher) {
          batcher.add(requestData);
        } else {
          client.sendRequest(requestData).catch(err => {
            console.error('[Klaro SDK] Error sending request:', err);
          });
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}
