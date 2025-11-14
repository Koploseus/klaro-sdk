"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KlaroClient = void 0;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
/**
 * HTTP client for sending data to Klaro backend
 */
class KlaroClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl || 'https://api.klaro.sh';
        this.timeout = config.timeout || 5000;
    }
    /**
     * Send API request data to Klaro
     */
    async sendRequest(data) {
        return this.post('/api/v1/ingest', data);
    }
    /**
     * Send batch of API requests to Klaro
     */
    async sendBatch(requests) {
        return this.post('/api/v1/ingest/batch', { requests });
    }
    /**
     * Send LLM request data to Klaro
     */
    async sendLLMRequest(data) {
        return this.post('/api/v1/llm/ingest', data);
    }
    /**
     * Generic POST request
     */
    async post(path, data) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.apiUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https_1.default : http_1.default;
            const postData = JSON.stringify(data);
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-API-Key': this.apiKey,
                    'User-Agent': 'klaro-sdk/0.1.0',
                },
                timeout: this.timeout,
            };
            const req = lib.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    }
                    else {
                        reject(new Error(`Klaro API error: ${res.statusCode} - ${responseData}`));
                    }
                });
            });
            req.on('error', (error) => {
                // Don't throw - log and continue to not break customer's API
                console.error('[Klaro SDK] Error sending data:', error.message);
                resolve(); // Resolve anyway to not block
            });
            req.on('timeout', () => {
                req.destroy();
                console.error('[Klaro SDK] Request timeout');
                resolve(); // Resolve anyway to not block
            });
            req.write(postData);
            req.end();
        });
    }
}
exports.KlaroClient = KlaroClient;
