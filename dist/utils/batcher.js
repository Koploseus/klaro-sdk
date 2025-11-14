"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batcher = void 0;
/**
 * Batches requests and sends them periodically to reduce network overhead
 */
class Batcher {
    constructor(client, config = {}) {
        this.batch = [];
        this.timer = null;
        this.client = client;
        this.maxBatchSize = config.maxBatchSize || 10;
        this.flushInterval = config.flushInterval || 5000; // 5 seconds
        // Start flush timer
        this.startTimer();
    }
    /**
     * Add request to batch
     */
    add(request) {
        this.batch.push(request);
        // Flush if batch is full
        if (this.batch.length >= this.maxBatchSize) {
            this.flush();
        }
    }
    /**
     * Flush current batch to Klaro
     */
    async flush() {
        if (this.batch.length === 0) {
            return;
        }
        const toSend = [...this.batch];
        this.batch = [];
        try {
            await this.client.sendBatch(toSend);
        }
        catch (error) {
            // Log but don't throw - we don't want to break customer's app
            console.error('[Klaro SDK] Error flushing batch:', error);
        }
    }
    /**
     * Start periodic flush timer
     */
    startTimer() {
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
    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await this.flush();
    }
}
exports.Batcher = Batcher;
