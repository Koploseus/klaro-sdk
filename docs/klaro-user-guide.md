# Klaro User Guide

**Version**: 1.0.0  
**Last Updated**: November 16, 2025  
**Author**: Klaro Team

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Quickstart Guide](#quickstart-guide)
3. [Integration Guides](#integration-guides)
4. [Dashboard Guide](#dashboard-guide)
5. [Use Cases & Examples](#use-cases--examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### What is Klaro?

Klaro is a **cost tracking platform** designed specifically for AI SaaS companies that need to understand and attribute their infrastructure costs to individual customers. As AI-powered applications become more complex, tracking costs across API requests, LLM usage, and cloud resources becomes critical for profitability and pricing decisions.

Traditional analytics tools focus on user behavior and engagement, but they do not provide visibility into the actual costs incurred by each customer. Klaro fills this gap by automatically capturing cost data from your application and presenting it in an intuitive dashboard that helps you make data-driven decisions about pricing, resource allocation, and customer profitability.

### Why Klaro?

Building cost tracking from scratch requires significant engineering effort. You need to instrument your application, build data pipelines, set up analytics infrastructure, and create dashboards. Klaro provides all of this out of the box, allowing you to focus on building your product instead of building internal tools.

**Key Benefits** include per-customer cost attribution that shows exactly how much each customer costs to serve, LLM cost tracking with automatic token counting and cost calculation for OpenAI, Anthropic, and Google models, PII detection to identify sensitive data in LLM responses and ensure compliance, real-time dashboards with interactive visualizations and filtering, and zero performance impact through asynchronous telemetry and efficient batching.

### Who Should Use Klaro?

Klaro is designed for AI SaaS companies that use large language models (LLMs) and need to track costs at the customer level. Typical use cases include AI chatbots and assistants that process customer conversations, document analysis and summarization services, code generation and developer tools, customer support automation, and content generation platforms.

If you are building an AI-powered SaaS product and need to answer questions like "Which customers are most expensive to serve?", "How much does each LLM request cost?", or "Are we detecting PII in our LLM responses?", Klaro is the right solution for you.

---

## Quickstart Guide

### Step 1: Sign Up

Navigate to [https://dashboard.getklaros.com](https://dashboard.getklaros.com) and sign up using your email address or Google account. Klaro uses Clerk for authentication, which provides enterprise-grade security and supports single sign-on (SSO) for teams.

After signing up, you will be prompted to create an organization. An organization represents your company or team and is the top-level entity in Klaro. All customers, API keys, and telemetry data belong to an organization.

### Step 2: Create an API Key

Once you have created an organization, navigate to the **Settings** page and click on **API Keys**. Click the **Create API Key** button to generate a new key. Give your key a descriptive name (e.g., "Production API Key") and click **Create**.

The full API key will be displayed only once. Copy it and store it securely in your password manager or secrets management system. You will need this key to authenticate SDK requests from your application.

API keys are prefixed with `klaro_` and consist of 64 hexadecimal characters. They are hashed using SHA-256 before storage, so even if the database is compromised, attackers cannot retrieve the original keys.

### Step 3: Install the SDK

Install the Klaro SDK in your Node.js application using npm, yarn, or pnpm:

```bash
npm install @klaro/sdk
```

The SDK requires Node.js 18 or higher and is compatible with TypeScript 5.0 or higher. If you are using TypeScript, the SDK includes full type definitions for autocomplete and type checking.

### Step 4: Add Middleware

Add the Klaro middleware to your Express application to automatically track all API requests. The middleware should be added before your route handlers to ensure all requests are captured.

```typescript
import express from 'express';
import { klaroMiddleware } from '@klaro/sdk';

const app = express();

// Add Klaro middleware
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id, // Extract customer ID from request
  skipPaths: ['/health', '/metrics'] // Skip health checks
}));

// Your routes...
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

The `getCustomerId` function is critical because it tells Klaro how to extract the customer ID from each request. This function should return a consistent identifier for the customer making the request, such as a user ID from your authentication system.

### Step 5: Track LLM Usage

If your application uses LLMs, wrap your LLM SDK with Klaro to automatically track token usage and costs. Klaro provides drop-in replacements for popular LLM SDKs that maintain the same API while adding cost tracking.

**For OpenAI**:

```typescript
import { KlaroOpenAI } from '@klaro/sdk';

const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: true // Optional: detect PII in responses
});

// Use like normal OpenAI SDK
const response = await klaro.chat.completions.create({
  customerId: req.user.id, // Required for cost attribution
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

**For Anthropic Claude**:

```typescript
import { KlaroClaude } from '@klaro/sdk';

const klaro = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!
});

const response = await klaro.messages.create({
  customerId: req.user.id,
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

**For Google Gemini**:

```typescript
import { KlaroGemini } from '@klaro/sdk';

const klaro = new KlaroGemini({
  klaroApiKey: process.env.KLARO_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!
});

const response = await klaro.generateContent({
  customerId: req.user.id,
  model: 'gemini-pro',
  prompt: 'Hello!'
});
```

### Step 6: View Your Data

After deploying your application with the Klaro SDK, telemetry data will start flowing to the Klaro backend. Navigate to the **Dashboard** page in the Klaro web interface to view your cost data.

The dashboard displays summary cards showing total LLM cost, total requests, PII detection rate, and active customer count. Below the summary cards, you will see a breakdown of costs by customer, allowing you to identify which customers are most expensive to serve.

You can filter data by date range using the date picker in the top right corner. The default view shows data from the last 30 days, but you can select custom date ranges for more granular analysis.

---

## Integration Guides

### Express.js Integration

The Klaro middleware integrates seamlessly with Express.js applications and can be added in just a few lines of code.

#### Basic Setup

The simplest integration involves adding the middleware to your Express app and providing a function to extract the customer ID from each request.

```typescript
import express from 'express';
import { klaroMiddleware } from '@klaro/sdk';

const app = express();

app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id
}));

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

The middleware captures the following metadata for each request: HTTP method (GET, POST, etc.), request path (e.g., /api/users), status code (200, 404, etc.), response time in milliseconds, timestamp, and optionally headers and query parameters.

#### Advanced Configuration

For production deployments, you may want to customize the middleware behavior to optimize performance and reduce noise.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => {
    // Extract customer ID from JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return undefined;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return decoded.userId;
    } catch {
      return undefined;
    }
  },
  skipPaths: [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt'
  ],
  enableBatching: true,
  maxBatchSize: 20,
  flushInterval: 10000, // 10 seconds
  captureHeaders: false, // Disable for privacy
  captureQuery: true
}));
```

The `skipPaths` option allows you to exclude certain paths from tracking, such as health checks and static assets. This reduces noise in your analytics and prevents unnecessary API calls to Klaro.

The `enableBatching` option enables request batching, which groups multiple telemetry records into a single HTTP request to reduce network overhead. The `maxBatchSize` and `flushInterval` options control when batches are flushed to the backend.

#### Error Handling

The middleware operates asynchronously and does not block the request-response cycle. If the Klaro backend is unavailable, the middleware logs a warning and discards the telemetry data, ensuring your application continues to function normally.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  onError: (error) => {
    // Custom error handling
    console.error('Klaro middleware error:', error);
    // Optionally send to error tracking service
  }
}));
```

---

### OpenAI Integration

The Klaro OpenAI wrapper provides automatic cost tracking and PII detection for OpenAI API calls.

#### Basic Usage

Replace your existing OpenAI client with the Klaro wrapper and add the `customerId` parameter to your API calls.

```typescript
import { KlaroOpenAI } from '@klaro/sdk';

const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

// In your route handler
app.post('/api/chat', async (req, res) => {
  const response = await klaro.chat.completions.create({
    customerId: req.user.id, // Required
    model: 'gpt-4',
    messages: req.body.messages
  });
  
  res.json(response);
});
```

The wrapper automatically captures token usage from the OpenAI response and calculates the cost based on the model pricing. The telemetry data is sent asynchronously to Klaro, so there is no impact on response time.

#### Streaming Responses

The wrapper supports streaming responses for real-time chat applications.

```typescript
app.post('/api/chat/stream', async (req, res) => {
  const stream = await klaro.chat.completions.create({
    customerId: req.user.id,
    model: 'gpt-4',
    messages: req.body.messages,
    stream: true
  });
  
  res.setHeader('Content-Type', 'text/event-stream');
  
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  
  res.end();
});
```

For streaming responses, the wrapper buffers the entire response to count tokens and calculate cost. The telemetry data is sent after the stream completes.

#### PII Detection

Enable PII detection to identify sensitive data in LLM responses and ensure compliance with data protection regulations.

```typescript
const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: true
});

const response = await klaro.chat.completions.create({
  customerId: req.user.id,
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'What is John Doe\'s email?' }]
});

// PII detection happens automatically
// View results in the Klaro dashboard
```

The wrapper scans the response text for common PII types including email addresses, phone numbers, Social Security Numbers, credit card numbers, IP addresses, street addresses, dates of birth, passport numbers, driver's license numbers, and full names (heuristic).

If PII is detected, the categories are stored in the telemetry data and displayed in the Klaro dashboard. This allows you to identify prompts that may be leaking sensitive information and take corrective action.

#### Error Handling

The wrapper handles errors gracefully and returns the original OpenAI error to your application.

```typescript
try {
  const response = await klaro.chat.completions.create({
    customerId: req.user.id,
    model: 'gpt-4',
    messages: req.body.messages
  });
  res.json(response);
} catch (error) {
  // Original OpenAI error is preserved
  console.error('OpenAI error:', error);
  res.status(500).json({ error: 'Failed to generate response' });
}
```

If telemetry submission fails, the wrapper logs a warning but does not throw an exception. Your application continues to function normally, and the LLM response is returned as expected.

---

### Anthropic Claude Integration

The Klaro Claude wrapper provides the same functionality as the OpenAI wrapper but for Anthropic's Claude models.

#### Basic Usage

```typescript
import { KlaroClaude } from '@klaro/sdk';

const klaro = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  enablePIIDetection: true
});

app.post('/api/chat', async (req, res) => {
  const response = await klaro.messages.create({
    customerId: req.user.id,
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: req.body.messages
  });
  
  res.json(response);
});
```

The wrapper supports all Claude models including Claude 3 Opus, Claude 3 Sonnet, and Claude 3 Haiku. Cost calculation is based on the official Anthropic pricing for each model.

#### Streaming Responses

Claude supports streaming responses for real-time applications.

```typescript
app.post('/api/chat/stream', async (req, res) => {
  const stream = await klaro.messages.create({
    customerId: req.user.id,
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: req.body.messages,
    stream: true
  });
  
  res.setHeader('Content-Type', 'text/event-stream');
  
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  }
  
  res.end();
});
```

---

### Google Gemini Integration

The Klaro Gemini wrapper provides cost tracking for Google's Gemini models.

#### Basic Usage

```typescript
import { KlaroGemini } from '@klaro/sdk';

const klaro = new KlaroGemini({
  klaroApiKey: process.env.KLARO_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!
});

app.post('/api/chat', async (req, res) => {
  const response = await klaro.generateContent({
    customerId: req.user.id,
    model: 'gemini-pro',
    prompt: req.body.prompt
  });
  
  res.json({ text: response.text });
});
```

The wrapper supports Gemini Pro and Gemini Pro Vision models. Cost calculation is based on the official Google pricing.

---

## Dashboard Guide

### Dashboard Overview

The Dashboard Overview page provides a high-level summary of your cost data and customer activity.

#### Summary Cards

At the top of the dashboard, you will see four summary cards that display key metrics for the selected date range.

**Total LLM Cost** shows the total cost of all LLM requests in USD. This includes costs from all providers (OpenAI, Anthropic, Google) and all models. The cost is calculated based on token usage and model pricing.

**Total Requests** displays the total number of LLM requests made during the selected period. This helps you understand request volume and identify usage spikes.

**PII Detected** shows the number of requests where PII was detected in the response, along with the percentage of total requests. This metric helps you monitor compliance and identify potential data leaks.

**Active Customers** displays the number of unique customers who made at least one request during the selected period. This helps you understand customer engagement and identify inactive customers.

#### Cost by Customer

Below the summary cards, you will see a table showing cost breakdown by customer. Each row displays the customer name, external ID, request count, and total cost.

The table is sorted by total cost in descending order, so the most expensive customers appear at the top. You can click on a customer row to view detailed analytics for that customer.

The table also includes a bar chart showing the relative cost of each customer, making it easy to identify outliers and high-cost customers.

#### Date Range Filtering

Use the date picker in the top right corner to filter data by date range. The default view shows data from the last 30 days, but you can select custom date ranges for more granular analysis.

Common date ranges include Last 7 days, Last 30 days, Last 90 days, This month, Last month, and Custom range (select start and end dates).

---

### Customers Page

The Customers page provides a list of all customers in your organization, along with detailed cost and usage metrics.

#### Customer List

The customer list displays each customer's name, external ID, creation date, total cost, request count, and last request timestamp.

You can search for customers by name or external ID using the search bar at the top of the page. The search is case-insensitive and matches partial strings.

The list is paginated with 20 customers per page. Use the pagination controls at the bottom to navigate between pages.

#### Customer Details

Click on a customer row to view detailed analytics for that customer. The detail view shows a breakdown of costs by provider and model, request volume over time, PII detection rate, and average latency.

This view helps you understand the cost drivers for each customer and identify opportunities for optimization.

---

### LLM Costs Page

The LLM Costs page provides a detailed view of all LLM requests with advanced filtering and analysis capabilities.

#### Summary Cards

At the top of the page, you will see summary cards showing total cost, total requests, PII detected count, and average latency for the filtered dataset.

These metrics update dynamically as you apply filters, allowing you to analyze specific subsets of your data.

#### PII Detection Breakdown

The PII Detection Breakdown chart shows the distribution of PII types detected across all requests. The chart displays the count of each PII category (email, phone, SSN, etc.) as a bar chart.

This visualization helps you identify which types of PII are most commonly detected and prioritize mitigation efforts.

#### Request List

Below the charts, you will see a paginated list of all LLM requests. Each row displays provider, model, customer name, timestamp, cost, latency, token counts, status, PII detected badge, and PII categories.

You can expand each row to view the full prompt and response text. This is useful for debugging and understanding why certain requests are expensive or contain PII.

#### Filtering

The LLM Costs page provides powerful filtering capabilities to help you analyze specific subsets of your data.

**Provider Filter** allows you to filter by LLM provider (OpenAI, Anthropic, Google, Cohere). Select one or more providers from the dropdown menu.

**Model Filter** lets you filter by model name (e.g., gpt-4, claude-3-opus). Enter a partial model name to filter results.

**PII Detected Filter** enables filtering by PII detection status. Select "With PII" to show only requests where PII was detected, or "Without PII" to show only clean requests.

**Search** allows you to search within prompts and responses. Enter keywords to find specific requests.

**Date Range** lets you filter by date range using the date picker. The default view shows all requests, but you can narrow down to specific time periods.

All filters can be combined to create complex queries. For example, you can filter for "OpenAI requests with PII detected in the last 7 days" to identify recent compliance issues.

---

## Use Cases & Examples

### Use Case 1: Identify High-Cost Customers

**Scenario**: You are running an AI chatbot service and want to identify which customers are generating the highest LLM costs so you can adjust pricing or optimize usage.

**Solution**: Navigate to the Dashboard Overview page and review the Cost by Customer table. The table is sorted by total cost in descending order, so the most expensive customers appear at the top.

Click on a high-cost customer to view detailed analytics. Look at the breakdown by provider and model to understand which LLM calls are driving costs. For example, if a customer is using GPT-4 extensively, you might suggest they switch to GPT-3.5 Turbo for less critical tasks.

You can also export the cost data to CSV for further analysis in Excel or Google Sheets. Use the export button in the top right corner of the dashboard.

---

### Use Case 2: Monitor PII Leakage

**Scenario**: You are building a customer support automation tool and need to ensure that your LLM responses do not leak sensitive customer information like email addresses or phone numbers.

**Solution**: Enable PII detection in the Klaro SDK by setting `enablePIIDetection: true` when initializing the LLM wrapper.

```typescript
const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: true
});
```

Navigate to the LLM Costs page and filter for requests with PII detected. Review the PII categories to understand which types of sensitive data are being exposed.

Click on individual requests to view the full prompt and response. Identify patterns in the prompts that lead to PII leakage and update your system prompts or input sanitization logic to prevent future occurrences.

For example, if you notice that prompts containing "What is the customer's email?" frequently result in email addresses in the response, you can add a filter to block such prompts or sanitize the response before returning it to the user.

---

### Use Case 3: Optimize LLM Model Selection

**Scenario**: You are using GPT-4 for all LLM requests but suspect that many requests could be handled by the cheaper GPT-3.5 Turbo model without sacrificing quality.

**Solution**: Navigate to the LLM Costs page and filter for GPT-4 requests. Review the prompts and responses to identify simple queries that do not require GPT-4's advanced reasoning capabilities.

For example, if you see prompts like "Summarize this paragraph" or "Translate this text to Spanish," these tasks can likely be handled by GPT-3.5 Turbo at a fraction of the cost.

Update your application logic to route simple queries to GPT-3.5 Turbo and reserve GPT-4 for complex reasoning tasks. Monitor the cost savings in the Klaro dashboard over the next few weeks.

You can also use the Cost by Model breakdown to compare costs across different models and identify optimization opportunities.

---

### Use Case 4: Track API Usage by Customer

**Scenario**: You are running a SaaS API and want to understand which customers are making the most API requests so you can implement usage-based pricing.

**Solution**: Add the Klaro middleware to your Express application to automatically track all API requests.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id
}));
```

Navigate to the Customers page and review the request count for each customer. Sort the table by request count to identify the most active customers.

Click on a customer to view detailed analytics, including request volume over time and breakdown by endpoint. This helps you understand which API endpoints are most popular and identify usage patterns.

Use this data to implement usage-based pricing tiers (e.g., $10/month for up to 1,000 requests, $50/month for up to 10,000 requests) and ensure your pricing aligns with actual usage.

---

## Best Practices

### 1. Always Provide Customer ID

Klaro only tracks requests with a valid customer ID. Make sure your `getCustomerId` function returns a consistent identifier for each request.

**Good Example**:
```typescript
getCustomerId: (req) => req.user?.id
```

**Bad Example**:
```typescript
getCustomerId: (req) => Math.random().toString() // Random ID every time
```

If the customer ID is missing or changes frequently, your analytics will be inaccurate and you will not be able to attribute costs correctly.

---

### 2. Skip Health Checks and Static Assets

Exclude health check endpoints and static assets from tracking to avoid noise in your analytics.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  skipPaths: [
    '/health',
    '/ping',
    '/metrics',
    '/favicon.ico',
    '/robots.txt'
  ]
}));
```

Health checks are typically called every few seconds by load balancers and monitoring systems, which can generate thousands of requests per day. Excluding these paths reduces noise and improves the signal-to-noise ratio in your analytics.

---

### 3. Use Environment Variables for API Keys

Never hardcode API keys in your source code. Use environment variables to store sensitive credentials.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!, // From environment variable
  getCustomerId: (req) => req.user?.id
}));
```

Store your API key in a `.env` file for local development and use your deployment platform's secrets management system (e.g., Heroku Config Vars, Vercel Environment Variables) for production.

**Example `.env` file**:
```
KLARO_API_KEY=klaro_a1b2c3d4e5f6...
```

Add `.env` to your `.gitignore` file to prevent accidentally committing secrets to version control.

---

### 4. Enable Batching in Production

Batching reduces network overhead and is recommended for production deployments.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  enableBatching: true,
  maxBatchSize: 20,
  flushInterval: 10000 // 10 seconds
}));
```

With batching enabled, the SDK groups multiple telemetry records into a single HTTP request, reducing network calls by up to 90%. This improves performance and reduces costs.

For local development, you can disable batching to see telemetry data in real-time:

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  enableBatching: false // Disable for local development
}));
```

---

### 5. Monitor PII Detection

If you enable PII detection, regularly review the PII Detection Breakdown chart to identify trends and potential compliance issues.

Set up alerts to notify you when PII detection rate exceeds a certain threshold (e.g., 10% of requests). This helps you catch issues early and take corrective action before they become major problems.

You can export PII detection data to CSV and analyze it in Excel or Google Sheets to identify patterns and root causes.

---

### 6. Rotate API Keys Periodically

For security best practices, rotate your API keys every 90 days. This reduces the risk of unauthorized access if a key is compromised.

To rotate an API key, create a new key in the Klaro dashboard, update your application's environment variables, deploy the changes, and revoke the old key after confirming the new key is working.

Klaro supports multiple active API keys per organization, so you can create a new key before revoking the old one to ensure zero downtime during rotation.

---

### 7. Use Separate API Keys for Environments

Use separate API keys for development, staging, and production environments. This provides better isolation and makes it easier to debug issues without affecting production data.

For example, create three API keys: "Development API Key", "Staging API Key", and "Production API Key". Use the appropriate key in each environment's `.env` file.

This also allows you to revoke a development key without affecting production if it is accidentally leaked.

---

## Troubleshooting

### Problem: No Data in Klaro Dashboard

**Symptoms**: The Klaro dashboard shows zero requests and zero cost, even though your application is running and making API calls.

**Possible Causes**:
1. API key is incorrect or revoked
2. `getCustomerId` function is returning `undefined`
3. Requests are being skipped by `skipPaths`
4. SDK is not installed or middleware is not added
5. Network connectivity issues between your application and Klaro backend

**Solutions**:

**Check API Key**: Verify that the API key in your environment variables matches the key shown in the Klaro dashboard. API keys are case-sensitive and must be prefixed with `klaro_`.

```bash
echo $KLARO_API_KEY
```

If the key is incorrect, update your `.env` file and restart your application.

**Check Customer ID**: Add logging to your `getCustomerId` function to verify it is returning valid IDs.

```typescript
getCustomerId: (req) => {
  const id = req.user?.id;
  console.log('Customer ID:', id); // Add logging
  return id;
}
```

If the function is returning `undefined`, check your authentication middleware to ensure `req.user` is being set correctly.

**Check Skip Paths**: Review your `skipPaths` configuration to ensure you are not accidentally excluding all requests.

```typescript
skipPaths: ['/health', '/metrics'] // Only skip health checks
```

**Check SDK Installation**: Verify that the Klaro SDK is installed and the middleware is added to your Express app.

```bash
npm list @klaro/sdk
```

If the SDK is not installed, run `npm install @klaro/sdk`.

**Check Network Connectivity**: Test connectivity to the Klaro backend using `curl`:

```bash
curl https://klaro-backend-8864a43dffbd.herokuapp.com/health
```

If the request fails, check your firewall settings and ensure outbound HTTPS traffic is allowed.

---

### Problem: "customerId is required" Error

**Symptoms**: You see errors in your application logs saying "customerId is required" or "Invalid request body".

**Cause**: The `getCustomerId` function is returning `undefined` for some requests, and the SDK is trying to send telemetry data without a customer ID.

**Solution**: Update your `getCustomerId` function to handle cases where the customer ID is not available.

```typescript
getCustomerId: (req) => {
  const id = req.user?.id;
  if (!id) {
    console.warn('No customer ID found for request:', req.path);
  }
  return id;
}
```

The SDK will skip tracking for requests where `getCustomerId` returns `undefined`, so your application will continue to function normally.

If you want to track unauthenticated requests, you can return a placeholder customer ID like `"anonymous"`:

```typescript
getCustomerId: (req) => req.user?.id || 'anonymous'
```

However, this will group all unauthenticated requests under a single customer, which may not be useful for analytics.

---

### Problem: High Memory Usage

**Symptoms**: Your application's memory usage increases over time and eventually crashes with an out-of-memory error.

**Cause**: The SDK's batching system is accumulating telemetry data in memory faster than it can flush to the backend.

**Solution**: Reduce the batch size and flush interval to ensure data is sent more frequently.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  maxBatchSize: 5, // Reduce from default 10
  flushInterval: 3000 // Reduce from default 5000ms
}));
```

You can also disable batching entirely to send each request immediately:

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  enableBatching: false
}));
```

However, this will increase network overhead and may impact performance for high-traffic applications.

---

### Problem: Incorrect Cost Calculations

**Symptoms**: The costs shown in the Klaro dashboard do not match your expectations or the costs reported by your LLM provider.

**Cause**: The SDK uses hardcoded pricing tables for cost calculation, which may be outdated if the provider changes their pricing.

**Solution**: Check the Klaro technical documentation for the current pricing tables used by the SDK. If the pricing is outdated, contact Klaro support to request an update.

You can also manually verify the cost calculation by checking the token counts and model pricing:

```
Cost = (Input Tokens / 1000) * Input Price + (Output Tokens / 1000) * Output Price
```

For example, a GPT-4 request with 1,500 input tokens and 800 output tokens would cost:

```
Cost = (1500 / 1000) * $0.03 + (800 / 1000) * $0.06
     = $0.045 + $0.048
     = $0.093
```

If the calculated cost does not match the dashboard, there may be a bug in the SDK. Report the issue to Klaro support with the request details.

---

### Problem: PII Detection False Positives

**Symptoms**: The PII detection system is flagging requests that do not actually contain PII, leading to false alarms.

**Cause**: The PII detection system uses regex patterns that may match non-PII data. For example, the phone number pattern may match numeric sequences that are not phone numbers.

**Solution**: Review the flagged requests in the Klaro dashboard to understand the false positive patterns. If the false positive rate is high, you can disable PII detection or implement custom filtering logic.

```typescript
const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: false // Disable if false positives are too high
});
```

Alternatively, you can implement custom PII detection logic in your application and only flag requests that meet your specific criteria.

---

### Problem: Slow API Response Times

**Symptoms**: Your API response times have increased after adding the Klaro SDK.

**Cause**: The SDK operates asynchronously and should not impact response times. However, if batching is disabled or the flush interval is very short, the SDK may be making too many network calls.

**Solution**: Enable batching and increase the flush interval to reduce network overhead.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  enableBatching: true,
  maxBatchSize: 20,
  flushInterval: 10000 // 10 seconds
}));
```

You can also profile your application to identify the bottleneck. Use tools like `node --inspect` or `clinic.js` to measure CPU and memory usage.

If the SDK is confirmed to be the bottleneck, contact Klaro support for assistance.

---

## FAQ

### General Questions

**Q: What is Klaro?**

A: Klaro is a cost tracking platform for AI SaaS companies that helps you understand and attribute infrastructure costs (API requests, LLM usage, cloud resources) to individual customers.

**Q: How much does Klaro cost?**

A: Klaro offers a free tier for up to 10,000 requests per month. Paid plans start at $49/month for up to 100,000 requests. Contact sales for enterprise pricing.

**Q: Is Klaro open source?**

A: The Klaro SDK is open source and available on GitHub under the MIT license. The backend and dashboard are proprietary.

**Q: Can I self-host Klaro?**

A: Self-hosting is not currently supported. Klaro is offered as a managed SaaS platform.

---

### Integration Questions

**Q: Which programming languages does Klaro support?**

A: Klaro currently supports Node.js (JavaScript and TypeScript). Support for Python, Ruby, and Go is planned for future releases.

**Q: Which LLM providers does Klaro support?**

A: Klaro supports OpenAI, Anthropic (Claude), and Google (Gemini). Support for additional providers (e.g., Cohere, Hugging Face) can be added upon request.

**Q: Can I use Klaro with serverless functions (AWS Lambda, Vercel Functions)?**

A: Yes, Klaro works with serverless functions. However, you should disable batching to ensure telemetry data is sent before the function terminates.

```typescript
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  enableBatching: false // Disable for serverless
}));
```

**Q: Can I use Klaro with GraphQL APIs?**

A: Yes, Klaro works with GraphQL APIs. The middleware captures the HTTP request metadata (method, path, status code, duration) regardless of the API protocol.

**Q: Does Klaro support WebSocket or gRPC?**

A: Klaro currently only supports HTTP/HTTPS APIs. WebSocket and gRPC support is planned for future releases.

---

### Data & Privacy Questions

**Q: Where is my data stored?**

A: Klaro stores data in a PostgreSQL database hosted on Supabase (AWS us-east-1 region). All data is encrypted at rest and in transit.

**Q: How long is data retained?**

A: Data is retained for 90 days by default. Enterprise customers can request longer retention periods.

**Q: Can I export my data?**

A: Yes, you can export data to CSV from the Klaro dashboard. API access for bulk data export is available for enterprise customers.

**Q: Is Klaro GDPR compliant?**

A: Yes, Klaro is GDPR compliant. We provide data processing agreements (DPAs) upon request.

**Q: Does Klaro store LLM prompts and responses?**

A: Yes, Klaro stores prompts and responses for PII detection and analytics. You can disable this by setting `enablePIIDetection: false` and not using the LLM wrappers.

**Q: Can I delete customer data?**

A: Yes, you can delete customer data from the Klaro dashboard. Contact support for bulk deletion requests.

---

### Billing & Pricing Questions

**Q: How is usage calculated?**

A: Usage is calculated based on the number of API requests and LLM requests tracked by the SDK. Health checks and requests without a customer ID are not counted.

**Q: What happens if I exceed my plan limits?**

A: If you exceed your plan limits, Klaro will continue to track requests but will send you an email notification. You can upgrade your plan at any time to avoid service interruption.

**Q: Can I change my plan?**

A: Yes, you can upgrade or downgrade your plan at any time from the Klaro dashboard. Changes take effect immediately.

**Q: Do you offer discounts for startups?**

A: Yes, we offer a 50% discount for early-stage startups (less than 2 years old, less than $1M in revenue). Contact sales for details.

---

### Support Questions

**Q: How do I get support?**

A: You can contact support via email at support@klaro.sh or submit a GitHub issue at [https://github.com/Koploseus/klaro-sdk/issues](https://github.com/Koploseus/klaro-sdk/issues).

**Q: What is the support SLA?**

A: Free tier customers receive best-effort support. Paid customers receive email support with a 24-hour response time. Enterprise customers can purchase priority support with a 4-hour response time.

**Q: Can I request new features?**

A: Yes, we welcome feature requests! Submit them via GitHub issues or email support@klaro.sh.

---

**End of User Guide**
