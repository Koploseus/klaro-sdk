"use strict";
/**
 * @klaro/sdk - Official Node.js SDK for Klaro
 *
 * Track API requests and LLM costs per customer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batcher = exports.KlaroClient = exports.KlaroOpenAI = exports.klaroMiddleware = void 0;
var express_1 = require("./middleware/express");
Object.defineProperty(exports, "klaroMiddleware", { enumerable: true, get: function () { return express_1.klaroMiddleware; } });
var openai_1 = require("./llm/openai");
Object.defineProperty(exports, "KlaroOpenAI", { enumerable: true, get: function () { return openai_1.KlaroOpenAI; } });
var client_1 = require("./utils/client");
Object.defineProperty(exports, "KlaroClient", { enumerable: true, get: function () { return client_1.KlaroClient; } });
var batcher_1 = require("./utils/batcher");
Object.defineProperty(exports, "Batcher", { enumerable: true, get: function () { return batcher_1.Batcher; } });
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
