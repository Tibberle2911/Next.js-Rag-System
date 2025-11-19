# Digital Twin RAG System

Enterprise-grade Next.js application featuring advanced Retrieval-Augmented Generation (RAG) with Model Context Protocol (MCP) server integration, Puter AI authentication, comprehensive fallback systems, and real-time monitoring. Built for professional profile assistance and digital twin applications.

## 🚀 Live Demo

**Deployed on Vercel**: [[Preview link ->](https://next-js-rag-system.vercel.app/)]

## ✨ Key Features

### Core Capabilities
- **🤖 Dual RAG Modes**: Basic and Advanced RAG with automatic fallback
- **🔐 Puter AI Integration**: Client-side authentication with secure AI access
- **🎯 MCP Server**: Full Model Context Protocol implementation for external integrations
- **🔄 Smart Fallback System**: Multi-layer fallback chain (Puter → Gemini → Groq)
- **📊 Real-time Monitoring**: Live metrics dashboard with fallback tracking
- **🎨 Modern UI**: ShadCN UI components with dark mode support

### Advanced RAG Techniques
- Multi-query generation with RAG Fusion
- Query decomposition and step-back prompting
- HyDE (Hypothetical Document Embeddings)
- Reciprocal Rank Fusion (RRF) for result merging
- Contextual compression and reranking
- Interview-style response formatting

### Intelligent Fallback Architecture
1. **Provider Fallbacks**:
   - Puter AI → Gemini API → Groq API
   - Python RAGAS → JavaScript evaluator
2. **Mode Fallbacks**:
   - Advanced RAG → Basic RAG (rate limit protection)
   - MCP Advanced → MCP Basic
3. **Comprehensive Logging**: All fallbacks tracked in Neon Postgres

## 🛠 Tech Stack

- **Framework**: Next.js 16.0.2-canary.12 with React 19.2.0
- **UI**: ShadCN UI + Tailwind CSS 4.1.9
- **Vector Database**: Upstash Vector (1024D embeddings)
- **Primary LLM**: Google Gemini 2.0 Flash
- **Fallback LLM**: Groq (LLaMA 3.1)
- **Client Auth**: Puter AI SDK
- **Metrics DB**: Neon Postgres (pooled)
- **Deployment**: Vercel
- **Language**: TypeScript 5
- **Package Manager**: pnpm 8+

## 📋 Prerequisites

- Node.js 20+ and pnpm 8+
- Upstash Vector Database account
- Google Gemini API key
- Groq API key (fallback)
- Neon Postgres database
- Puter account (for client features)

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# === PRIMARY LLM: Google Gemini (Required) ===
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-2.0-flash-lite"  # Default model
USE_GEMINI="true"  # Enable Gemini as primary provider

# === FALLBACK LLM: Groq API ===
GROQ_API_KEY="your_groq_api_key_here"
GROQ_EMBEDDING_MODEL="llama-3.1-8b-instant"

# === Upstash Vector Database (Required for RAG) ===
UPSTASH_VECTOR_REST_TOKEN="your_upstash_vector_token_here"
UPSTASH_VECTOR_REST_READONLY_TOKEN="your_upstash_readonly_token_here"
UPSTASH_VECTOR_REST_URL="https://your-vector-db.upstash.io"

# === Neon Postgres (Metrics & Fallback Tracking) ===
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<database>?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://<user>:<password>@<neon-host-unpooled>/<database>?sslmode=require"
PGHOST="<neon-host-pooler>"
PGHOST_UNPOOLED="<neon-host-direct>"
PGUSER="<user>"
PGDATABASE="<database>"
PGPASSWORD="<password>"
POSTGRES_PRISMA_URL="postgresql://<user>:<password>@<neon-host-pooler>/<database>?connect_timeout=15&sslmode=require"

# === Optional: Metrics & Monitoring ===
ENABLE_METRICS_LOGGING="true"  # Enable metrics collection
NEXT_PUBLIC_DEBUG="false"  # Enable debug logging

# === Optional: Puter AI (Client-side) ===
NEXT_PUBLIC_PUTER_MODEL_FALLBACKS="google/gemini-2.5-pro,google/gemini-2.5-flash"
NEXT_PUBLIC_PUTER_DISABLE_MODERATION="true"
```

## 📦 Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tibberle2911/Next.js-Rag-System.git
   cd Next.js-Rag-System
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🚀 Vercel Deployment

### Option 1: Deploy with Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Set environment variables**:
   ```bash
   # Core variables
   vercel env add GEMINI_API_KEY
   vercel env add GROQ_API_KEY
   vercel env add UPSTASH_VECTOR_REST_TOKEN
   vercel env add UPSTASH_VECTOR_REST_READONLY_TOKEN
   vercel env add UPSTASH_VECTOR_REST_URL
   vercel env add DATABASE_URL
   
   # Optional variables
   vercel env add ENABLE_METRICS_LOGGING
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy with GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables in the Vercel dashboard
   - Deploy automatically on push

### Option 3: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tibberle2911/Next.js-Rag-System)

### Important Deployment Notes

⚠️ **Excluded from Vercel Build** (via `.vercelignore`):
- `app/evaluation/*` - Evaluation UI pages
- `app/api/evaluation/*` - Evaluation API routes
- `api/*.py` - Python evaluation scripts
- `python_evaluators/*` - Python dependencies
- `lib/evaluation-frameworks.ts` - Python bridge (local only)

✅ **What's Deployed**:
- Core RAG system (basic + advanced)
- MCP server with fallback logic
- Chat interface with Puter integration
- Real-time monitoring dashboard
- Fallback tracking system
- All TypeScript/JavaScript code

## 🔐 Environment Variables Setup

⚠️ **SECURITY WARNING**: Never commit real API keys to git! Always use placeholder values in documentation.

### Google Gemini API (Primary LLM)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add `GEMINI_API_KEY` to environment variables
3. Set `GEMINI_MODEL` to `gemini-2.0-flash-lite` (default) or other supported model
4. Keep `USE_GEMINI=true` for primary usage

**Supported Models**:
- `gemini-2.0-flash-lite` (fastest, recommended)
- `gemini-2.0-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-flash`

### Groq API (Fallback LLM)

1. Get API key from [groq.com](https://console.groq.com)
2. Add `GROQ_API_KEY` to environment variables
3. Set `GROQ_EMBEDDING_MODEL` to `llama-3.1-8b-instant`
4. Automatically used when Gemini encounters rate limits or errors

### Upstash Vector Database

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Vector Index with:
   - Dimensions: 1024
   - Similarity: Cosine
3. Copy the REST URL and tokens from dashboard
4. Add to environment variables:
   - `UPSTASH_VECTOR_REST_URL`
   - `UPSTASH_VECTOR_REST_TOKEN`
   - `UPSTASH_VECTOR_REST_READONLY_TOKEN`

### Neon Postgres (Metrics & Fallback Tracking)

All metrics and fallback events are stored exclusively in Neon Postgres (no Redis).

1. **Create Neon Project**:
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project and database
   
2. **Configure Environment**:
   ```bash
   DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
   ENABLE_METRICS_LOGGING="true"
   ```

3. **Auto-Created Tables** (on first write):
   ```sql
   -- Request metrics with detailed tracking
   CREATE TABLE rag_requests (
      id BIGSERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      service TEXT NOT NULL,
      kind TEXT NOT NULL,
      status INT NOT NULL,
      ok BOOLEAN NOT NULL,
      duration_ms INT,
      endpoint TEXT,
      query TEXT,
      error_message TEXT,
      fallback_used BOOLEAN,
      mode TEXT
   );
   
   -- Fallback tracking for monitoring
   CREATE TABLE rag_fallbacks (
      id BIGSERIAL PRIMARY KEY,
      ts BIGINT NOT NULL,
      service TEXT NOT NULL,
      kind TEXT NOT NULL,
      from_mode TEXT NOT NULL,  -- e.g., 'puter', 'mcp_advanced_rag', 'gemini'
      to_mode TEXT NOT NULL,    -- e.g., 'gemini', 'mcp_basic_rag', 'groq'
      reason TEXT NOT NULL,     -- 'rate_limit', 'error', 'invalid_model'
      original_status INT,
      message TEXT,
      query TEXT
   );
   ```

4. **Tracked Fallback Scenarios**:
   - **Puter → Gemini**: Client auth issues, rate limits, invalid models
   - **Gemini → Groq**: API rate limits, errors, timeouts
   - **MCP Advanced → Basic**: Rate limits, advanced RAG failures
   - **Gemini Advanced RAG → Basic RAG**: Advanced technique failures
   - **Python RAGAS → JavaScript**: Serverless environment detection

5. **Query Metrics**:
   ```sql
   -- Performance analysis
   SELECT service, kind, COUNT(*) AS total, 
          AVG(duration_ms) AS avg_ms
   FROM rag_requests
   WHERE ts > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
   GROUP BY service, kind
   ORDER BY total DESC;
   
   -- Fallback frequency by reason
   SELECT from_mode, to_mode, reason, COUNT(*) AS total
   FROM rag_fallbacks
   WHERE ts > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
   GROUP BY from_mode, to_mode, reason
   ORDER BY total DESC;
   ```

6. **Health Check**: 
   - Visit `/api/metrics/health` 
   - Returns `backend: postgres` when Neon is active
   - Includes recent request/fallback counts

**Security**: Never commit real Postgres credentials. Use Vercel environment variables for production.

## 📚 API Endpoints

### Core RAG Endpoints
- **`POST /api/chat`** - Main chat interface with RAG
  - Supports both basic and advanced modes
  - Automatic fallback from advanced to basic
  - Returns answer with sources and metadata

### MCP Server Endpoints
- **`GET /api/mcp`** - MCP protocol handshake (SSE)
- **`POST /api/mcp`** - MCP tool execution
  - `basic_rag_query` - Standard RAG query
  - `advanced_rag_query` - Advanced RAG with techniques
  - `rag_query` - Mode-selectable RAG (default: advanced)
  - Auto-fallback from advanced to basic on rate limits

### Monitoring & Metrics
- **`GET /api/metrics/health`** - Health check with Postgres status
- **`POST /api/metrics/client`** - Log client-side events and fallbacks
- **`GET /api/metrics/loadtest`** - Performance testing endpoint

### Utility Endpoints
- **`POST /api/vector-context`** - Server-side vector retrieval
- **`POST /api/puter`** - Puter AI proxy (client auth required)

### Evaluation Endpoints (Local Only)
- **`POST /api/evaluation/run`** - Batch evaluation with RAGAS
- **`POST /api/evaluation/single`** - Single query evaluation
- **`GET /api/evaluation/progress`** - Evaluation progress tracking

*Note: Evaluation endpoints excluded from Vercel deployment*

## 🔍 Architecture Overview

### RAG Modes

#### Basic RAG
- **Retrieval**: Direct vector similarity search (top-K)
- **Generation**: Single-pass LLM generation
- **Context**: Concatenated top results
- **Speed**: ~1-2 seconds
- **Use Case**: Quick queries, general questions

#### Advanced RAG
- **Multi-Query**: Generate 5 diverse query variations
- **RAG Fusion**: Reciprocal Rank Fusion for result merging
- **Query Enhancement**: Contextual query expansion
- **Decomposition**: Break complex queries into sub-questions
- **Step-Back**: Generate broader context queries
- **HyDE**: Hypothetical document generation
- **Interview Formatting**: Structured STAR-style responses
- **Speed**: ~3-5 seconds
- **Use Case**: Complex questions, behavioral interviews

### Fallback Chain Architecture

```
┌─────────────────────────────────────────────────┐
│          Client Layer (Browser)                 │
│  Puter AI ──(fail)──> Gemini API (via /api)   │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│          Server Layer (Next.js)                 │
│  Gemini ──(fail)──> Groq                       │
│  Advanced RAG ──(fail)──> Basic RAG            │
│  MCP Advanced ──(fail)──> MCP Basic            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│          Data Layer                             │
│  Upstash Vector (primary)                      │
│  Neon Postgres (metrics + fallback logs)       │
└─────────────────────────────────────────────────┘
```

### Pages & Features

- **`/` (Chat)**: Main interface with Puter authentication
  - Real-time streaming responses
  - Source document display
  - RAG mode selector (basic/advanced)
  - Advanced configuration panel
  
- **`/monitoring`**: Live metrics dashboard
  - Real-time request tracking
  - Fallback event visualization
  - Performance charts (bar/pie)
  - Recent events table with fallback details

- **`/mcp-test`**: MCP server testing interface
  - Tool discovery and listing
  - Interactive tool execution
  - Response visualization

- **`/advanced-features`**: Feature showcase
  - RAG technique explanations
  - Configuration options
  - Performance comparisons

- **`/optimization`**: Performance documentation
  - Caching strategies
  - Query optimization tips
  - System tuning guide

- **`/scalability`**: Architecture documentation
  - System design patterns
  - Scaling considerations
  - Best practices

- **`/operations`**: Operational guides
  - Deployment procedures
  - Monitoring setup
  - Troubleshooting

- **`/evaluation`**: Performance evaluation *(Local only)*
  - RAGAS metrics (faithfulness, precision, recall, etc.)
  - Batch testing with test cases
  - Comprehensive feedback generation

## 🛡️ Production Considerations

### Error Handling & Resilience
- **Multi-layer fallback**: Automatic provider switching on failures
- **Rate limit protection**: Intelligent retry with exponential backoff
- **Graceful degradation**: Advanced → Basic mode fallback
- **Comprehensive logging**: All errors logged to Neon Postgres

### Performance Optimization
- **Edge caching**: Static assets cached at edge locations
- **Query optimization**: Efficient vector similarity search
- **Context compression**: Smart truncation of large contexts
- **Streaming responses**: Real-time text generation

### Security Best Practices
- **Environment variables**: Sensitive data never in code
- **CORS configuration**: Restricted to allowed origins
- **API key rotation**: Support for multiple key fallbacks
- **Input validation**: Zod schema validation on all inputs
- **PII detection**: Automatic filtering of personal information

### Monitoring & Observability
- **Health checks**: `/api/metrics/health` endpoint
- **Real-time dashboard**: Live request and fallback tracking
- **Performance metrics**: Response times, success rates
- **Fallback analytics**: Track provider reliability
- **Database metrics**: Postgres query performance

### Scalability
- **Serverless functions**: Auto-scaling with Vercel
- **Connection pooling**: Neon Postgres pooled connections
- **Vector indexing**: Optimized Upstash queries
- **Stateless design**: No server-side session storage

## 🔄 Fallback System Details

### Logged Fallback Scenarios

1. **Puter → Gemini** (`from: 'puter'`, `to: 'gemini'`)
   - Reasons: `rate_limit`, `permission_denied`, `invalid_model`, `error`
   - Logged in: `app/page.tsx`
   - Triggers: Puter SDK errors, authentication failures

2. **Gemini → Groq** (`from: 'gemini'`, `to: 'groq'`)
   - Reasons: `rate_limit`, `error`
   - Logged in: `lib/groq-client.ts`
   - Triggers: Gemini API 429, timeouts, errors

3. **MCP Advanced → Basic** (`from: 'mcp_advanced_rag'`, `to: 'mcp_basic_rag'`)
   - Reasons: `rate_limit`, `error`
   - Logged in: `app/api/mcp/route.ts`
   - Triggers: Advanced RAG failures, rate limits

4. **Gemini Advanced RAG → Basic RAG** (`from: 'advanced_rag'`, `to: 'basic_rag'`)
   - Reasons: `rate_limit`, `error`
   - Logged in: `app/actions.ts`
   - Triggers: Advanced technique failures

5. **Python RAGAS → JavaScript** (`from: 'python_ragas'`, `to: 'javascript_evaluator'`)
   - Reasons: Python endpoint unavailable (Vercel)
   - Logged in: `lib/evaluation-frameworks.ts`
   - Triggers: Serverless environment detection

### Monitoring Fallbacks

Visit `/monitoring` to see:
- **Real-time fallback events**: Last 20 fallbacks with details
- **Fallback frequency**: Bar chart by transition type
- **Reason distribution**: Pie chart of failure reasons
- **Recent events table**: Timestamps, modes, reasons, queries

## 🐛 Troubleshooting

### Common Issues

1. **"Missing Upstash Vector configuration" error**:
   - ✓ Ensure all three Upstash environment variables are set
   - ✓ Check that your Upstash Vector index is active (not paused)
   - ✓ Verify vector dimensions match (1024D for this app)
   - ✓ Test connection at [Upstash Console](https://console.upstash.com)

2. **"GEMINI_API_KEY not configured" error**:
   - ✓ Verify your Gemini API key is valid and set in `.env.local`
   - ✓ Check API key has proper permissions at [Google AI Studio](https://makersuite.google.com)
   - ✓ Ensure `USE_GEMINI=true` is set
   - ✓ Fallback to Groq should happen automatically if configured

3. **"Rate limit exceeded" errors**:
   - ✓ Check `/monitoring` dashboard for fallback activity
   - ✓ Verify Gemini → Groq fallback is working
   - ✓ Advanced → Basic fallback should trigger automatically
   - ✓ Wait 60 seconds and retry (rate limits reset)

4. **MCP server not responding**:
   - ✓ Check CORS headers are properly configured
   - ✓ Verify `/api/mcp` endpoint is accessible
   - ✓ Test with `/mcp-test` page for diagnostics
   - ✓ Check server logs in Vercel dashboard

5. **Puter authentication failing**:
   - ✓ Ensure you're logged into Puter account
   - ✓ Check browser console for SDK errors
   - ✓ Verify Puter SDK loaded (`window.puter` exists)
   - ✓ Fallback to Gemini should work automatically

6. **Postgres connection errors**:
   - ✓ Verify `DATABASE_URL` is correct in environment variables
   - ✓ Check Neon project is active (not suspended)
   - ✓ Test connection with `/api/metrics/health`
   - ✓ Ensure pooled connection string is used

7. **Build failures on Vercel**:
   - ✓ Check `.vercelignore` excludes evaluation code
   - ✓ Verify no Python dependencies in production build
   - ✓ Review build logs for specific errors
   - ✓ Ensure Node.js version is 20+

### Debugging Tips

**Enable Debug Mode**:
```bash
NEXT_PUBLIC_DEBUG=true  # Client-side logging
```

**Check Health Status**:
```bash
curl https://your-app.vercel.app/api/metrics/health
```

**Test Individual Endpoints**:
```bash
# Test RAG query
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test query", "mode": "basic"}'

# Test MCP server
curl https://your-app.vercel.app/api/mcp
```

**Monitor Fallbacks**:
- Visit `/monitoring` page
- Check Recent Events table for fallback details
- Review Fallback Analysis charts for patterns
- Query Postgres directly for detailed logs

**Check Vercel Logs**:
```bash
vercel logs --follow
```

**Local Development Debugging**:
```bash
# Run with verbose logging
NEXT_PUBLIC_DEBUG=true pnpm dev

# Check Postgres connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rag_fallbacks;"
```

### Performance Issues

1. **Slow responses (>10s)**:
   - Switch to Basic RAG mode (faster)
   - Check if Advanced → Basic fallback triggered
   - Review vector query performance
   - Consider reducing `topK` parameter

2. **High error rates**:
   - Check `/monitoring` for fallback patterns
   - Verify API keys are valid and have quota
   - Review Postgres logs for specific errors
   - Test individual providers separately

3. **Memory issues**:
   - Reduce context window size
   - Limit number of sources returned
   - Check for large query results
   - Monitor Vercel function memory usage

---

**Built with ❤️ using Next.js 16, Gemini AI, Upstash Vector, and comprehensive fallback systems**
