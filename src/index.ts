/**
 * @klaro/sdk - Official Node.js SDK for Klaro
 * 
 * Track API requests and LLM costs per customer
 */

export { klaroMiddleware, KlaroMiddlewareConfig } from './middleware/express';
export { KlaroOpenAI, KlaroOpenAIConfig } from './llm/openai';
export { KlaroClient, KlaroClientConfig, RequestData, LLMRequestData } from './utils/client';
export { Batcher, BatcherConfig } from './utils/batcher';

/**
 * Quick start example:
 * 
 * ```typescript
 * import express from 'express';
 * import { klaroMiddleware, KlaroOpenAI } from '@klaro/sdk';
 * 
 * const app = express();
 * 
 * // 1. Add API monitoring middleware
 * app.use(klaroMiddleware({
 *   apiKey: 'klaro_abc123',
 *   getCustomerId: (req) => req.user?.id
 * }));
 * 
 * // 2. Initialize LLM tracking
 * const klaro = new KlaroOpenAI({
 *   klaroApiKey: 'klaro_abc123',
 *   openaiApiKey: 'sk-...'
 * });
 * 
 * // 3. Use in your routes
 * app.post('/api/chat', async (req, res) => {
 *   const response = await klaro.chat.completions.create({
 *     customerId: req.user.id,
 *     model: 'gpt-4',
 *     messages: req.body.messages
 *   });
 *   res.json(response);
 * });
 * ```
 */
