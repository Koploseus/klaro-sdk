import { Request, Response, NextFunction } from 'express';
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
export declare function klaroMiddleware(config: KlaroMiddlewareConfig): (req: Request, res: Response, next: NextFunction) => void;
