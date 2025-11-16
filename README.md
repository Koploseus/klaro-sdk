# @klaro/sdk

Official Node.js SDK for [Klaro](https://klaro.sh) - Track API requests and LLM costs per customer.

## Features

- **API Monitoring**: Express middleware that automatically tracks all API requests
- **LLM Cost Tracking**: OpenAI wrapper that tracks token usage and costs per customer
- **Batching**: Efficient request batching to minimize network overhead
- **Zero Performance Impact**: Async tracking that doesn't slow down your API
- **PII Detection**: Optional PII detection for LLM responses
- **Type-Safe**: Written in TypeScript with full type definitions

## Installation

```bash
npm install @klaro/sdk
```

## Quick Start

### 1. API Monitoring

Add the Klaro middleware to your Express app to automatically track all API requests:

```typescript
import express from 'express';
import { klaroMiddleware } from '@klaro/sdk';

const app = express();

// Add Klaro middleware
app.use(klaroMiddleware({
  apiKey: 'klaro_abc123',
  getCustomerId: (req) => req.user?.id
}));

// Your routes...
app.get('/api/data', (req, res) => {
  res.json({ data: 'Hello World' });
});
```

### 2. LLM Cost Tracking

Track OpenAI costs per customer:

```typescript
import { KlaroOpenAI } from '@klaro/sdk';

const klaro = new KlaroOpenAI({
  klaroApiKey: 'klaro_abc123',
  openaiApiKey: 'sk-...'
});

// Use like normal OpenAI SDK, but pass customerId
const response = await klaro.chat.completions.create({
  customerId: user.id,
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## API Reference

### `klaroMiddleware(config)`

Express middleware for API monitoring.

**Configuration:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | - | Your Klaro API key |
| `getCustomerId` | `(req) => string \| undefined` | Yes | - | Function to extract customer ID from request |
| `apiUrl` | `string` | No | `https://api.klaro.sh` | Klaro API URL |
| `enableBatching` | `boolean` | No | `true` | Enable request batching |
| `maxBatchSize` | `number` | No | `10` | Maximum batch size |
| `flushInterval` | `number` | No | `5000` | Flush interval in milliseconds |
| `captureHeaders` | `boolean` | No | `false` | Capture request headers |
| `captureQuery` | `boolean` | No | `true` | Capture query parameters |
| `skipPaths` | `string[]` | No | `[]` | Paths to skip (e.g., `/health`) |

**Example:**

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY,
  getCustomerId: (req) => req.user?.id,
  skipPaths: ['/health', '/metrics']
}));
```

### `KlaroOpenAI`

OpenAI wrapper with cost tracking.

**Configuration:**

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `klaroApiKey` | `string` | Yes | - | Your Klaro API key |
| `openaiApiKey` | `string` | Yes | - | Your OpenAI API key |
| `klaroApiUrl` | `string` | No | `https://api.klaro.sh` | Klaro API URL |
| `enablePIIDetection` | `boolean` | No | `false` | Enable PII detection |

**Example:**

```typescript
const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  enablePIIDetection: true
});

// Pass customerId in the request
const response = await klaro.chat.completions.create({
  customerId: 'customer_123',
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ]
});
```

## Advanced Usage

### Custom Customer ID Extraction

The `getCustomerId` function can extract the customer ID from anywhere in the request:

```typescript
// From JWT token
getCustomerId: (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, secret);
  return decoded.userId;
}

// From custom header
getCustomerId: (req) => req.headers['x-customer-id']

// From subdomain
getCustomerId: (req) => {
  const subdomain = req.hostname.split('.')[0];
  return subdomain;
}
```

### Disable Batching

For real-time tracking, disable batching:

```typescript
app.use(klaroMiddleware({
  apiKey: 'klaro_abc123',
  getCustomerId: (req) => req.user?.id,
  enableBatching: false
}));
```

### Access Raw OpenAI Client

If you need to use OpenAI features not wrapped by Klaro:

```typescript
const klaro = new KlaroOpenAI({
  klaroApiKey: 'klaro_abc123',
  openaiApiKey: 'sk-...'
});

// Access raw OpenAI client
const embeddings = await klaro.raw.embeddings.create({
  model: 'text-embedding-ada-002',
  input: 'Hello world'
});
```

## How It Works

The Klaro SDK tracks your API usage in three ways:

1. **API Requests**: The Express middleware captures request metadata (method, path, status code, duration) and sends it to Klaro asynchronously
2. **LLM Usage**: The OpenAI wrapper tracks token usage and calculates costs based on the model used
3. **Infrastructure Costs**: Klaro automatically syncs your GCP/AWS costs and attributes them to customers based on request volume

All tracking happens asynchronously and includes retry logic, so it won't slow down your API or cause errors if Klaro is temporarily unavailable.

## Best Practices

### 1. Always Provide Customer ID

Klaro only tracks requests with a valid customer ID. Make sure your `getCustomerId` function returns a consistent identifier:

```typescript
// ✅ Good - consistent ID
getCustomerId: (req) => req.user?.id

// ❌ Bad - random ID
getCustomerId: (req) => Math.random().toString()
```

### 2. Skip Health Checks

Exclude health check endpoints to avoid noise:

```typescript
app.use(klaroMiddleware({
  apiKey: 'klaro_abc123',
  getCustomerId: (req) => req.user?.id,
  skipPaths: ['/health', '/ping', '/metrics']
}));
```

### 3. Use Environment Variables

Never hardcode API keys:

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY,
  getCustomerId: (req) => req.user?.id
}));
```

### 4. Enable Batching in Production

Batching reduces network overhead and is recommended for production:

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY,
  getCustomerId: (req) => req.user?.id,
  enableBatching: true,
  maxBatchSize: 20,
  flushInterval: 10000 // 10 seconds
}));
```

## Troubleshooting

### "customerId is required" Error

Make sure your `getCustomerId` function returns a valid string:

```typescript
getCustomerId: (req) => {
  const id = req.user?.id;
  if (!id) {
    console.warn('No customer ID found for request:', req.path);
  }
  return id;
}
```

### No Data in Klaro Dashboard

1. Check that your API key is correct
2. Verify that `getCustomerId` is returning valid IDs
3. Make sure requests are not being skipped by `skipPaths`
4. Check the console for any SDK errors

### High Memory Usage

If you're seeing high memory usage, reduce the batch size:

```typescript
app.use(klaroMiddleware({
  apiKey: 'klaro_abc123',
  getCustomerId: (req) => req.user?.id,
  maxBatchSize: 5,
  flushInterval: 3000
}));
```

## Support

- Documentation: [https://docs.klaro.sh](https://docs.klaro.sh)
- Email: support@klaro.sh
- GitHub Issues: [https://github.com/Koploseus/klaro-sdk/issues](https://github.com/Koploseus/klaro-sdk/issues)

## License

MIT

---

## 📚 Documentation

For complete documentation, see:

- **[Technical Documentation](./docs/klaro-technical-documentation.md)** - API reference, architecture, data models
- **[User Guide](./docs/klaro-user-guide.md)** - Quickstart, integration guides, troubleshooting
- **[Code Examples](./docs/klaro-code-examples.md)** - Real-world examples and use cases

### Architecture Diagrams

- [System Architecture](./docs/klaro-architecture-diagram.png)
- [Data Flow](./docs/klaro-data-flow-diagram.png)
- [Authentication Flow](./docs/klaro-auth-flow-diagram.png)

