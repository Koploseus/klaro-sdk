import https from 'https';
import http from 'http';

export interface KlaroClientConfig {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
}

export interface RequestData {
  customerId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}

export interface LLMRequestData {
  customerId: string;
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  timestamp: string;
  piiDetected?: boolean;
  piiCategories?: string[];
  piiCount?: number;
}

/**
 * HTTP client for sending data to Klaro backend
 */
export class KlaroClient {
  private apiKey: string;
  private apiUrl: string;
  private timeout: number;

  constructor(config: KlaroClientConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.klaro.sh';
    this.timeout = config.timeout || 5000;
  }

  /**
   * Send API request data to Klaro
   */
  async sendRequest(data: RequestData): Promise<void> {
    return this.post('/api/v1/ingest', data);
  }

  /**
   * Send batch of API requests to Klaro
   */
  async sendBatch(requests: RequestData[]): Promise<void> {
    return this.post('/api/v1/ingest/batch', { requests });
  }

  /**
   * Send LLM request data to Klaro
   */
  async sendLLMRequest(data: LLMRequestData): Promise<void> {
    return this.post('/api/v1/llm/ingest', data);
  }

  /**
   * Generic POST request
   */
  private async post(path: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

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
          } else {
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
