# Python Framework Evaluators

This directory contains authentic Python implementations of RAG evaluation frameworks:
- **RAGAS**: Using the official RAGAS library from explodinggradients/ragas
- **LangChain**: Using LangChain's evaluation capabilities

## Setup

### 1. Create Virtual Environment
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/Mac  
python -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file with your Groq API key:
```
GROQ_API_KEY=your_groq_api_key_here
GROQ_EMBEDDING_MODEL=llama-3.1-8b-instant
```

## Usage

### LangChain Evaluator
Evaluates 6 individual metrics using authentic LangChain framework:
- relevance
- coherence  
- factual_accuracy
- completeness
- context_usage
- professional_tone

```bash
python langchain_evaluator.py '{"question":"What is AI?","answer":"AI is...","rag_mode":"basic"}'
```

### RAGAS Evaluator  
Evaluates 6 RAGAS metrics using authentic RAGAS framework:
- faithfulness
- answer_relevancy
- context_precision
- context_recall
- context_relevancy
- answer_correctness

```bash
python ragas_evaluator.py '{"question":"What is AI?","answer":"AI is...","contexts":["context1"],"rag_mode":"basic"}'
```

## Integration with Node.js

The Node.js application in `lib/evaluation-frameworks.ts` automatically calls these Python scripts and parses their JSON output for seamless integration.

## Framework Authenticity

- **RAGAS**: Uses the official `ragas` library with genuine metrics calculation
- **LangChain**: Uses LangChain's prompting and evaluation capabilities with Groq LLM
- **No Mock Data**: All evaluations use real framework computations, not heuristics

## Error Handling

Both evaluators include comprehensive error handling with fallback scores to ensure the evaluation system remains stable even if individual framework calls fail.

## Performance

- Sequential evaluation to avoid API rate limits
- Configurable timeouts (30s for LangChain, 120s for RAGAS)  
- Retry logic with exponential backoff
- Mode-specific scoring for basic vs advanced RAG systems