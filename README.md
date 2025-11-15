# Digital Twin RAG System

Advanced Next.js application featuring Retrieval-Augmented Generation (RAG) with MCP server integration, built for professional profile assistance.

## 🚀 Live Demo

**Deployed on Vercel**: [Your Deployment URL]

## ✨ Features

- **Advanced RAG System**: Basic and Advanced RAG modes with multiple query techniques
- **Vector Search**: Upstash Vector database integration for semantic search
- **MCP Server**: Model Context Protocol server for external integrations  
- **Real-time Chat**: AI-powered conversation interface
- **Performance Analytics**: Built-in evaluation and optimization tracking
- **Responsive Design**: Optimized for all devices from mobile to desktop

## 🛠 Tech Stack

- **Framework**: Next.js 16.0.2-canary.12
- **UI**: ShadCN UI with Tailwind CSS
- **Vector Database**: Upstash Vector
- **LLM**: Groq API with LLaMA 3.1
- **Deployment**: Vercel
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Upstash Vector Database account
- Groq API key

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Upstash Vector Database - Required for RAG functionality
UPSTASH_VECTOR_REST_TOKEN="your_upstash_vector_token_here"
UPSTASH_VECTOR_REST_READONLY_TOKEN="your_upstash_readonly_token_here"
UPSTASH_VECTOR_REST_URL="https://your-vector-db.upstash.io"

# Groq API Configuration - Required for LLM responses
GROQ_API_KEY="your_groq_api_key_here"
GROQ_EMBEDDING_MODEL="llama-3.1-8b-instant"

# Neon Postgres (metrics & persistence)
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<database>?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://<user>:<password>@<neon-host-unpooled>/<database>?sslmode=require"
PGHOST="<neon-host-pooler>"
PGHOST_UNPOOLED="<neon-host-direct>"
PGUSER="<user>"
PGDATABASE="<database>"
PGPASSWORD="<password>"
POSTGRES_PRISMA_URL="postgresql://<user>:<password>@<neon-host-pooler>/<database>?connect_timeout=15&sslmode=require"
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
   vercel env add UPSTASH_VECTOR_REST_TOKEN
   vercel env add UPSTASH_VECTOR_REST_READONLY_TOKEN
   vercel env add UPSTASH_VECTOR_REST_URL
   vercel env add GROQ_API_KEY
   vercel env add GROQ_EMBEDDING_MODEL
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy with GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m \"Deploy to Vercel\"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in the Vercel dashboard
   - Deploy automatically

### Option 3: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tibberle2911/Next.js-Rag-System)

## 🔐 Environment Variables Setup

⚠️ **SECURITY WARNING**: Never commit real API keys to git! Always use placeholder values in documentation.

### Upstash Vector Database

1. Create account at [upstash.com](https://upstash.com)
2. Create a new Vector Index
3. Copy the REST URL and tokens
4. Add to Vercel environment variables

### Groq API

1. Get API key from [groq.com](https://groq.com)
2. Add `GROQ_API_KEY` to environment variables
3. Set `GROQ_EMBEDDING_MODEL` to `llama-3.1-8b-instant`

### Neon Postgres Metrics Storage

Metrics are now stored exclusively in Neon Postgres (no Redis fallback).

1. Create a Neon project and database.
2. Set `DATABASE_URL` (pooled) in `.env.local` and Vercel.
3. (Optional) Add `DATABASE_URL_UNPOOLED` for migrations.
4. Set `ENABLE_METRICS_LOGGING=true` (omit or set false to disable).
5. On first write the app automatically creates tables:

```sql
CREATE TABLE IF NOT EXISTS rag_requests (
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

CREATE TABLE IF NOT EXISTS rag_fallbacks (
   id BIGSERIAL PRIMARY KEY,
   ts BIGINT NOT NULL,
   service TEXT NOT NULL,
   kind TEXT NOT NULL,
   from_mode TEXT NOT NULL,
   to_mode TEXT NOT NULL,
   reason TEXT NOT NULL,
   original_status INT,
   message TEXT,
   query TEXT
);
```

6. Health endpoint returns `backend: postgres` when Neon is active.
7. To analyze metrics:

```sql
SELECT service, kind, COUNT(*) AS total, AVG(duration_ms) AS avg_ms
FROM rag_requests
GROUP BY service, kind
ORDER BY total DESC;

SELECT reason, COUNT(*) AS total
FROM rag_fallbacks
GROUP BY reason;
```

Security: Never commit real credentials. Use placeholders in shared code/docs.

## 📚 API Endpoints

- **Chat**: `/api/chat` - Main chat interface
- **MCP Server**: `/api/mcp` - Model Context Protocol server
- **Evaluation**: `/api/evaluation/run` - Performance evaluation
- **Transport**: `/api/[transport]` - MCP transport layer

## 🔍 Features Overview

### RAG Modes
- **Basic RAG**: Standard retrieval and generation
- **Advanced RAG**: Multi-query generation, RAG fusion, and enhanced techniques

### Pages
- **Chat**: AI conversation interface
- **Evaluation**: Performance metrics and testing
- **Optimization**: System improvement documentation  
- **Features**: Advanced capabilities overview
- **GitHub**: Repository and source code access
- **MCP Test**: Model Context Protocol testing interface

## 🛡️ Production Considerations

- **Error Handling**: Comprehensive error catching for API failures
- **Environment Validation**: Checks for required environment variables
- **CORS Headers**: Configured for cross-origin requests
- **Function Timeouts**: Optimized for Vercel's limits (30-60s)
- **Logging**: Structured logging for debugging and monitoring

## 🐛 Troubleshooting

### Common Issues

1. **\"Missing Upstash Vector configuration\" error**:
   - Ensure all Upstash environment variables are set
   - Check that your Upstash Vector index is active

2. **\"GROQ_API_KEY not configured\" error**:
   - Verify your Groq API key is valid and set in environment variables

3. **MCP server not responding**:
   - Check CORS headers are properly configured
   - Verify API routes are accessible

### Debugging Tips

- Check Vercel function logs in the dashboard
- Enable detailed logging in development with `DEBUG=*`
- Test API endpoints individually using tools like Postman

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, create an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js, Upstash Vector, and Groq AI