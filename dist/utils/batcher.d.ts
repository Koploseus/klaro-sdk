import { KlaroClient, RequestData } from './client';
export interface BatcherConfig {
    maxBatchSize?: number;
    flushInterval?: number;
}
/**
 * Batches requests and sends them periodically to reduce network overhead
 */
export declare class Batcher {
    private client;
    private batch;
    private maxBatchSize;
    private flushInterval;
    private timer;
    constructor(client: KlaroClient, config?: BatcherConfig);
    /**
     * Add request to batch
     */
    add(request: RequestData): void;
    /**
     * Flush current batch to Klaro
     */
    flush(): Promise<void>;
    /**
     * Start periodic flush timer
     */
    private startTimer;
    /**
     * Stop batching and flush remaining requests
     */
    stop(): Promise<void>;
}
