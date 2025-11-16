# Klaro Code Examples

**Version**: 1.0.0  
**Last Updated**: November 16, 2025  
**Author**: Klaro Team

---

## Table of Contents

1. [Basic Integration Examples](#basic-integration-examples)
2. [Advanced Integration Examples](#advanced-integration-examples)
3. [Real-World Use Cases](#real-world-use-cases)
4. [Testing & Debugging](#testing--debugging)

---

## Basic Integration Examples

### Example 1: Simple Express API with Klaro

This example shows a minimal Express API with Klaro middleware for request tracking.

```typescript
// server.ts
import express from 'express';
import { klaroMiddleware } from '@klaro/sdk';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// Authentication middleware (your existing auth)
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Add Klaro middleware AFTER auth middleware
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: (req) => req.user?.id,
  skipPaths: ['/health', '/metrics']
}));

// Your API routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', authMiddleware, (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', authMiddleware, (req, res) => {
  res.status(201).json({ user: { id: '123', name: 'John Doe' } });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Environment Variables** (`.env`):
```bash
KLARO_API_KEY=klaro_abc123...
JWT_SECRET=your-jwt-secret
```

---

### Example 2: OpenAI Integration with Cost Tracking

This example shows how to integrate Klaro with OpenAI for automatic cost tracking.

```typescript
// llm-service.ts
import { KlaroOpenAI } from '@klaro/sdk';

// Initialize Klaro OpenAI wrapper
const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: true
});

// Chat completion function
export async function generateChatResponse(
  customerId: string,
  messages: Array<{ role: string; content: string }>
) {
  try {
    const response = await klaro.chat.completions.create({
      customerId, // Required for cost attribution
      model: 'gpt-4',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage
    };
  } catch (error) {
    console.error('OpenAI error:', error);
    throw error;
  }
}

// Usage in Express route
import express from 'express';
const app = express();

app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { messages } = req.body;
    const result = await generateChatResponse(req.user.id, messages);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
```

**Environment Variables**:
```bash
KLARO_API_KEY=klaro_abc123...
OPENAI_API_KEY=sk-...
```

---

### Example 3: Anthropic Claude Integration

This example shows how to use Klaro with Anthropic's Claude models.

```typescript
// claude-service.ts
import { KlaroClaude } from '@klaro/sdk';

const klaro = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  enablePIIDetection: true
});

export async function generateClaudeResponse(
  customerId: string,
  prompt: string,
  systemPrompt?: string
) {
  try {
    const messages = systemPrompt
      ? [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: prompt }
        ]
      : [{ role: 'user' as const, content: prompt }];
    
    const response = await klaro.messages.create({
      customerId,
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      messages
    });
    
    return {
      content: response.content[0].text,
      usage: response.usage
    };
  } catch (error) {
    console.error('Claude error:', error);
    throw error;
  }
}

// Usage in Express route
app.post('/api/claude/chat', authMiddleware, async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const result = await generateClaudeResponse(
      req.user.id,
      prompt,
      systemPrompt
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
```

---

### Example 4: Google Gemini Integration

This example shows how to use Klaro with Google's Gemini models.

```typescript
// gemini-service.ts
import { KlaroGemini } from '@klaro/sdk';

const klaro = new KlaroGemini({
  klaroApiKey: process.env.KLARO_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!
});

export async function generateGeminiResponse(
  customerId: string,
  prompt: string
) {
  try {
    const response = await klaro.generateContent({
      customerId,
      model: 'gemini-pro',
      prompt
    });
    
    return {
      content: response.text,
      usage: response.usage
    };
  } catch (error) {
    console.error('Gemini error:', error);
    throw error;
  }
}

// Usage in Express route
app.post('/api/gemini/chat', authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;
    const result = await generateGeminiResponse(req.user.id, prompt);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
```

---

## Advanced Integration Examples

### Example 5: Multi-Provider LLM Router

This example shows how to route requests to different LLM providers based on the task complexity.

```typescript
// llm-router.ts
import { KlaroOpenAI, KlaroClaude, KlaroGemini } from '@klaro/sdk';

const openai = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

const claude = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!
});

const gemini = new KlaroGemini({
  klaroApiKey: process.env.KLARO_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!
});

export enum TaskComplexity {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex'
}

export async function routeLLMRequest(
  customerId: string,
  prompt: string,
  complexity: TaskComplexity
) {
  switch (complexity) {
    case TaskComplexity.SIMPLE:
      // Use cheapest model for simple tasks
      return await gemini.generateContent({
        customerId,
        model: 'gemini-pro',
        prompt
      });
    
    case TaskComplexity.MEDIUM:
      // Use GPT-3.5 for medium complexity
      const gpt35Response = await openai.chat.completions.create({
        customerId,
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
      return { text: gpt35Response.choices[0].message.content };
    
    case TaskComplexity.COMPLEX:
      // Use Claude Opus for complex reasoning
      const claudeResponse = await claude.messages.create({
        customerId,
        model: 'claude-3-opus-20240229',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      return { text: claudeResponse.content[0].text };
    
    default:
      throw new Error('Invalid complexity level');
  }
}

// Usage in Express route
app.post('/api/llm/smart-route', authMiddleware, async (req, res) => {
  try {
    const { prompt, complexity = TaskComplexity.MEDIUM } = req.body;
    const result = await routeLLMRequest(req.user.id, prompt, complexity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
```

---

### Example 6: Streaming Responses with Cost Tracking

This example shows how to implement streaming responses while still tracking costs.

```typescript
// streaming-service.ts
import { KlaroOpenAI } from '@klaro/sdk';

const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

export async function streamChatResponse(
  customerId: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void
) {
  const stream = await klaro.chat.completions.create({
    customerId,
    model: 'gpt-4',
    messages,
    stream: true
  });
  
  let fullResponse = '';
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    onChunk(content);
  }
  
  return fullResponse;
}

// Usage in Express route with Server-Sent Events (SSE)
app.post('/api/chat/stream', authMiddleware, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const { messages } = req.body;
    
    await streamChatResponse(
      req.user.id,
      messages,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    );
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});
```

---

### Example 7: Custom Customer ID Extraction

This example shows different ways to extract customer IDs from requests.

```typescript
// customer-id-extractors.ts

// Extract from JWT token
export const extractFromJWT = (req: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return undefined;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded.userId;
  } catch {
    return undefined;
  }
};

// Extract from custom header
export const extractFromHeader = (req: any) => {
  return req.headers['x-customer-id'];
};

// Extract from subdomain
export const extractFromSubdomain = (req: any) => {
  const subdomain = req.hostname.split('.')[0];
  return subdomain !== 'www' && subdomain !== 'api' ? subdomain : undefined;
};

// Extract from API key
export const extractFromAPIKey = (req: any) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return undefined;
  
  // Look up customer ID from your API key database
  const customer = lookupCustomerByAPIKey(apiKey);
  return customer?.id;
};

// Extract from session
export const extractFromSession = (req: any) => {
  return req.session?.userId;
};

// Usage in Klaro middleware
app.use(klaroMiddleware({
  apiKey: process.env.KLARO_API_KEY!,
  getCustomerId: extractFromJWT, // Choose your extraction method
  skipPaths: ['/health']
}));
```

---

### Example 8: Batching Configuration for Different Environments

This example shows how to configure batching differently for development, staging, and production.

```typescript
// klaro-config.ts
import { KlaroMiddlewareConfig } from '@klaro/sdk';

export function getKlaroConfig(): KlaroMiddlewareConfig {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig: KlaroMiddlewareConfig = {
    apiKey: process.env.KLARO_API_KEY!,
    getCustomerId: (req) => req.user?.id,
    skipPaths: ['/health', '/metrics']
  };
  
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        enableBatching: true,
        maxBatchSize: 50, // Larger batches in production
        flushInterval: 15000, // 15 seconds
        captureHeaders: false, // Privacy
        captureQuery: true
      };
    
    case 'staging':
      return {
        ...baseConfig,
        enableBatching: true,
        maxBatchSize: 20,
        flushInterval: 10000, // 10 seconds
        captureHeaders: true, // Debug headers in staging
        captureQuery: true
      };
    
    case 'development':
    default:
      return {
        ...baseConfig,
        enableBatching: false, // Real-time in dev
        captureHeaders: true,
        captureQuery: true
      };
  }
}

// Usage
import { klaroMiddleware } from '@klaro/sdk';
import { getKlaroConfig } from './klaro-config';

app.use(klaroMiddleware(getKlaroConfig()));
```

---

## Real-World Use Cases

### Use Case 1: AI Chatbot with Customer Support

This example shows a complete AI chatbot implementation with Klaro cost tracking.

```typescript
// chatbot-service.ts
import { KlaroOpenAI } from '@klaro/sdk';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

const klaro = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  enablePIIDetection: true // Important for customer support
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  customerId: string;
  conversationHistory: ChatMessage[];
}

export class ChatbotService {
  private sessions: Map<string, ChatSession> = new Map();
  
  async startSession(customerId: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${customerId}`;
    
    this.sessions.set(sessionId, {
      customerId,
      conversationHistory: [
        {
          role: 'system',
          content: 'You are a helpful customer support assistant. Be concise and professional.'
        }
      ]
    });
    
    return sessionId;
  }
  
  async sendMessage(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Add user message to history
    session.conversationHistory.push({
      role: 'user',
      content: message
    });
    
    // Generate response with Klaro tracking
    const response = await klaro.chat.completions.create({
      customerId: session.customerId,
      model: 'gpt-3.5-turbo', // Use cheaper model for support
      messages: session.conversationHistory as ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const assistantMessage = response.choices[0].message.content!;
    
    // Add assistant response to history
    session.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });
    
    return assistantMessage;
  }
  
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

// Express routes
const chatbot = new ChatbotService();

app.post('/api/chatbot/start', authMiddleware, async (req, res) => {
  try {
    const sessionId = await chatbot.startSession(req.user.id);
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start session' });
  }
});

app.post('/api/chatbot/message', authMiddleware, async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const response = await chatbot.sendMessage(sessionId, message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/api/chatbot/end', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    chatbot.endSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});
```

---

### Use Case 2: Document Summarization Service

This example shows a document summarization service with cost optimization.

```typescript
// summarization-service.ts
import { KlaroOpenAI, KlaroClaude } from '@klaro/sdk';

const openai = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

const claude = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!
});

export enum SummaryLength {
  SHORT = 'short', // 1-2 sentences
  MEDIUM = 'medium', // 1 paragraph
  LONG = 'long' // Multiple paragraphs
}

export async function summarizeDocument(
  customerId: string,
  document: string,
  length: SummaryLength = SummaryLength.MEDIUM
) {
  const wordCount = document.split(/\s+/).length;
  
  // Choose model based on document length
  const useClaudeForLongDocs = wordCount > 5000;
  
  const lengthInstructions = {
    [SummaryLength.SHORT]: 'in 1-2 sentences',
    [SummaryLength.MEDIUM]: 'in one paragraph',
    [SummaryLength.LONG]: 'in 3-4 paragraphs'
  };
  
  const prompt = `Summarize the following document ${lengthInstructions[length]}:\n\n${document}`;
  
  if (useClaudeForLongDocs) {
    // Claude has better context window for long documents
    const response = await claude.messages.create({
      customerId,
      model: 'claude-3-sonnet-20240229', // Good balance of cost/quality
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.content[0].text;
  } else {
    // Use GPT-3.5 for shorter documents (cheaper)
    const response = await openai.chat.completions.create({
      customerId,
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5 // Lower temperature for factual summaries
    });
    
    return response.choices[0].message.content!;
  }
}

// Express route
app.post('/api/summarize', authMiddleware, async (req, res) => {
  try {
    const { document, length = SummaryLength.MEDIUM } = req.body;
    
    if (!document || document.trim().length === 0) {
      return res.status(400).json({ error: 'Document is required' });
    }
    
    const summary = await summarizeDocument(req.user.id, document, length);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to summarize document' });
  }
});
```

---

### Use Case 3: Code Generation Tool

This example shows a code generation tool with multiple LLM providers.

```typescript
// code-generation-service.ts
import { KlaroOpenAI, KlaroClaude } from '@klaro/sdk';

const openai = new KlaroOpenAI({
  klaroApiKey: process.env.KLARO_API_KEY!,
  openaiApiKey: process.env.OPENAI_API_KEY!
});

const claude = new KlaroClaude({
  klaroApiKey: process.env.KLARO_API_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!
});

export enum ProgrammingLanguage {
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  GO = 'go',
  RUST = 'rust'
}

export async function generateCode(
  customerId: string,
  description: string,
  language: ProgrammingLanguage,
  useGPT4: boolean = false
) {
  const systemPrompt = `You are an expert ${language} programmer. Generate clean, well-documented, production-ready code based on the user's description. Include comments and follow best practices.`;
  
  if (useGPT4) {
    // Use GPT-4 for complex code generation
    const response = await openai.chat.completions.create({
      customerId,
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: description }
      ],
      temperature: 0.3 // Lower temperature for code generation
    });
    
    return response.choices[0].message.content!;
  } else {
    // Use Claude Sonnet for cost-effective code generation
    const response = await claude.messages.create({
      customerId,
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n${description}` }
      ]
    });
    
    return response.content[0].text;
  }
}

export async function explainCode(
  customerId: string,
  code: string,
  language: ProgrammingLanguage
) {
  const prompt = `Explain the following ${language} code in simple terms:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  
  // Use cheaper model for explanations
  const response = await openai.chat.completions.create({
    customerId,
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.choices[0].message.content!;
}

// Express routes
app.post('/api/code/generate', authMiddleware, async (req, res) => {
  try {
    const { description, language, useGPT4 = false } = req.body;
    
    if (!description || !language) {
      return res.status(400).json({ error: 'Description and language are required' });
    }
    
    const code = await generateCode(req.user.id, description, language, useGPT4);
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

app.post('/api/code/explain', authMiddleware, async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }
    
    const explanation = await explainCode(req.user.id, code, language);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to explain code' });
  }
});
```

---

## Testing & Debugging

### Example 9: Testing Klaro Integration

This example shows how to test your Klaro integration.

```typescript
// klaro.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { klaroMiddleware } from '@klaro/sdk';

describe('Klaro Integration Tests', () => {
  let app: express.Application;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication
    app.use((req: any, res, next) => {
      req.user = { id: 'test_customer_123' };
      next();
    });
    
    // Add Klaro middleware
    app.use(klaroMiddleware({
      apiKey: process.env.KLARO_API_KEY!,
      getCustomerId: (req) => req.user?.id,
      enableBatching: false // Disable batching for tests
    }));
    
    // Test routes
    app.get('/api/test', (req, res) => {
      res.json({ message: 'Test successful' });
    });
  });
  
  it('should track API requests', async () => {
    const response = await request(app)
      .get('/api/test')
      .expect(200);
    
    expect(response.body.message).toBe('Test successful');
    
    // Wait for telemetry to be sent
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify in Klaro dashboard manually or via API
  });
  
  it('should skip health check endpoints', async () => {
    const response = await request(app)
      .get('/health')
      .expect(404); // Route doesn't exist, but middleware should skip it
  });
});
```

---

### Example 10: Debugging Klaro Issues

This example shows how to add logging and debugging for Klaro integration.

```typescript
// klaro-debug.ts
import { klaroMiddleware } from '@klaro/sdk';

export function createDebugKlaroMiddleware() {
  return klaroMiddleware({
    apiKey: process.env.KLARO_API_KEY!,
    getCustomerId: (req) => {
      const customerId = req.user?.id;
      
      // Log customer ID extraction
      if (customerId) {
        console.log(`[Klaro] Customer ID extracted: ${customerId}`);
      } else {
        console.warn(`[Klaro] No customer ID found for request: ${req.method} ${req.path}`);
      }
      
      return customerId;
    },
    skipPaths: ['/health', '/metrics'],
    enableBatching: true,
    maxBatchSize: 10,
    flushInterval: 5000,
    onError: (error) => {
      // Log errors
      console.error('[Klaro] Error:', error);
      
      // Optionally send to error tracking service
      // Sentry.captureException(error);
    }
  });
}

// Usage
app.use(createDebugKlaroMiddleware());
```

---

### Example 11: Manual Telemetry Submission

This example shows how to manually submit telemetry data using the Klaro client.

```typescript
// manual-telemetry.ts
import { KlaroClient } from '@klaro/sdk';

const client = new KlaroClient({
  apiKey: process.env.KLARO_API_KEY!,
  apiUrl: 'https://klaro-backend-8864a43dffbd.herokuapp.com'
});

export async function trackCustomEvent(
  customerId: string,
  eventName: string,
  metadata: Record<string, any>
) {
  try {
    await client.trackRequest({
      customerId,
      path: `/events/${eventName}`,
      method: 'POST',
      statusCode: 200,
      duration: 0,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[Klaro] Custom event tracked: ${eventName}`);
  } catch (error) {
    console.error('[Klaro] Failed to track custom event:', error);
  }
}

// Usage
await trackCustomEvent('customer_123', 'document_uploaded', {
  documentId: 'doc_456',
  fileSize: 1024000,
  fileType: 'application/pdf'
});
```

---

**End of Code Examples**
