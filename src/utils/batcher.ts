import { KlaroClient, RequestData } from './client';

export interface BatcherConfig {
  maxBatchSize?: number;
  flushInterval?: number;
}

/**
 * Batches requests and sends them periodically to reduce network overhead
 */
export class Batcher {
  private client: KlaroClient;
  private batch: RequestData[] = [];
  private maxBatchSize: number;
  private flushInterval: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(client: KlaroClient, config: BatcherConfig = {}) {
    this.client = client;
    this.maxBatchSize = config.maxBatchSize || 10;
    this.flushInterval = config.flushInterval || 5000; // 5 seconds

    // Start flush timer
    this.startTimer();
  }

  /**
   * Add request to batch
   */
  add(request: RequestData): void {
    this.batch.push(request);

    // Flush if batch is full
    if (this.batch.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Flush current batch to Klaro
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) {
      return;
    }

    const toSend = [...this.batch];
    this.batch = [];

    try {
      await this.client.sendBatch(toSend);
    } catch (error) {
      // Log but don't throw - we don't want to break customer's app
      console.error('[Klaro SDK] Error flushing batch:', error);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Don't keep process alive
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Stop batching and flush remaining requests
   */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
