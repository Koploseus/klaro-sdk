"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.klaroMiddleware = klaroMiddleware;
const client_1 = require("../utils/client");
const batcher_1 = require("../utils/batcher");
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
function klaroMiddleware(config) {
    const client = new client_1.KlaroClient({
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
    });
    const batcher = config.enableBatching !== false
        ? new batcher_1.Batcher(client, {
            maxBatchSize: config.maxBatchSize,
            flushInterval: config.flushInterval,
        })
        : null;
    // Graceful shutdown
    if (batcher) {
        process.on('SIGTERM', () => batcher.stop());
        process.on('SIGINT', () => batcher.stop());
    }
    return (req, res, next) => {
        // Skip if path is in skipPaths
        if (config.skipPaths?.some(path => req.path.startsWith(path))) {
            return next();
        }
        const startTime = Date.now();
        // Capture response
        const originalSend = res.send;
        res.send = function (data) {
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
                    ...(config.captureHeaders && { headers: req.headers }),
                    ...(config.captureQuery !== false && { query: req.query }),
                };
                // Send to Klaro (async, don't wait)
                if (batcher) {
                    batcher.add(requestData);
                }
                else {
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
