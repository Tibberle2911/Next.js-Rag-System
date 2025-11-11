# RAG System Evaluation Suite

This comprehensive evaluation framework tests your Digital Twin RAG system using industry-standard metrics and frameworks.

## 🛠️ Setup

### 1. Install Dependencies
```bash
cd evaluation
pip install -r requirements.txt
```

### 2. Environment Setup
```bash
# Set your GROQ API key
export GROQ_API_KEY=your_groq_api_key_here

# Ensure your RAG system is running
cd .. && npm run dev
```

### Basic Usage
```bash
# Run complete evaluation suite
python run_evaluation.py

# Run specific evaluations
python run_evaluation.py --skip-ragas          # Skip RAGAS evaluation
python run_evaluation.py --skip-langchain     # Skip LangChain evaluation

# Specify custom RAG endpoint
python run_evaluation.py --rag-endpoint http://localhost:3001/api/chat
```

## 📊 Evaluation Frameworks

### 1. RAGAS Evaluation (`rag_evaluator.py`)
**Metrics:**
- **Faithfulness**: How grounded responses are in retrieved context
- **Answer Relevancy**: How well responses address the question
- **Context Precision**: Quality of retrieved context ranking
- **Context Recall**: Coverage of relevant information
- **Context Relevancy**: Relevance of retrieved contexts

**Output:**
- Comprehensive CSV results file
- Performance dashboard (HTML)
- Detailed analysis report (Markdown)

### 2. LangChain Evaluation (`langchain_evaluator.py`)
**Criteria:**
- **Relevance**: Response relevance to the question
- **Coherence**: Logical flow and structure
- **Harmfulness**: Safety and appropriateness
- **Factual Accuracy**: Correctness of information
- **Completeness**: Comprehensive coverage
- **Context Usage**: Effective use of provided context
- **Professional Tone**: Appropriate for digital twin

**Output:**
- Detailed JSON results with reasoning
- Criteria-by-criteria scoring
- Response quality analysis

## 📈 Understanding Results

### RAGAS Scores (0.0 - 1.0)
- **0.8+**: Excellent performance
- **0.6-0.8**: Good performance
- **0.4-0.6**: Acceptable performance
- **<0.4**: Needs improvement

### LangChain Scores (0.0 - 1.0)
- **0.9+**: Outstanding quality
- **0.7-0.9**: High quality
- **0.5-0.7**: Moderate quality
- **<0.5**: Requires attention

### Performance Benchmarks
- **Response Time**: <2s (Excellent), 2-5s (Good), >5s (Slow)
- **Context Retrieval**: 2-4 contexts optimal
- **Category Performance**: Experience > Skills > Projects > Education (typical)

## 🎯 Test Cases

### Categories
1. **Experience**: Work history, roles, achievements
2. **Skills**: Technical abilities, programming languages
3. **Projects**: Built solutions, impact, challenges
4. **Education**: Degrees, certifications, learning

### Complexity Levels
- **Easy**: Direct information retrieval
- **Medium**: Synthesis and explanation
- **Hard**: Complex reasoning and examples

## 📊 Generated Outputs

```
evaluation_results/
├── comprehensive_evaluation_TIMESTAMP.json    # Complete results
├── evaluation_report_TIMESTAMP.md            # Analysis report
├── rag_evaluation_results_TIMESTAMP.csv      # RAGAS data
├── langchain_evaluation_TIMESTAMP.json       # LangChain results
└── rag_performance_dashboard.html           # Interactive dashboard
```

## 🔍 Analysis Features

### Performance Dashboard
- Category-wise performance comparison
- Response time distribution analysis
- Metric correlation matrix
- Difficulty vs. performance scatter plot

### Actionable Recommendations
- Specific improvement areas
- Performance optimization tips
- Data quality enhancements
- Architecture suggestions

## 🚀 Advanced Usage

### Custom Test Cases
Modify test cases in each evaluator:
```python
# rag_evaluator.py
def create_test_dataset(self):
    return [
        RAGTestCase(
            question="Your custom question",
            expected_answer="Expected response pattern",
            context_keywords=["key", "words"],
            difficulty="medium",
            category="custom"
        )
    ]
```

### Custom Metrics
Add custom LangChain criteria:
```python
# langchain_evaluator.py
custom_evaluator = load_evaluator(
    EvaluatorType.LABELED_CRITERIA,
    criteria={"my_metric": "Your evaluation criteria"},
    llm=self.llm
)
```

### Batch Processing
```python
# For multiple RAG endpoints
endpoints = ["http://localhost:3000", "http://localhost:3001"]
for endpoint in endpoints:
    evaluator = ComprehensiveRAGEvaluationSuite(api_key, endpoint)
    await evaluator.run_comprehensive_evaluation()
```

## 🔧 Troubleshooting

### Common Issues

**ImportError: Missing dependencies**
```bash
pip install ragas langchain-groq renumics-spotlight
```

**Connection Error: RAG system not accessible**
```bash
# Ensure RAG system is running
curl http://localhost:3000/api/chat
```

**GROQ API Key Error**
```bash
# Verify API key is set
echo $GROQ_API_KEY
```

### Performance Optimization

1. **Reduce Test Cases**: Modify test datasets for faster evaluation
2. **Parallel Processing**: Use async/await for concurrent evaluations
3. **Selective Metrics**: Skip computationally expensive metrics
4. **Caching**: Implement response caching for repeated evaluations

## 📝 Integration

### CI/CD Pipeline
```yaml
# .github/workflows/rag-evaluation.yml
- name: Run RAG Evaluation
  run: |
    cd evaluation
    python run_evaluation.py
    # Upload results to monitoring system
```

### Monitoring Integration
```python
# Send results to monitoring
import requests

def send_to_monitoring(results):
    requests.post('https://monitoring.example.com/metrics', 
                 json=results['combined_analysis'])
```

### A/B Testing
```python
# Compare different RAG configurations
configs = ['config_a', 'config_b']
for config in configs:
    # Switch RAG configuration
    results = await evaluate_rag_system(config)
    # Compare results
```

## 🎯 Best Practices

1. **Regular Evaluation**: Run weekly evaluations
2. **Baseline Tracking**: Maintain performance benchmarks
3. **Regression Detection**: Alert on performance drops
4. **User Feedback Integration**: Combine with real user metrics
5. **Continuous Improvement**: Use results for system optimization

## 📚 Resources

- [RAGAS Documentation](https://github.com/explodinggradients/ragas)
- [LangChain Evaluation Guide](https://python.langchain.com/docs/guides/evaluation/)
- [RAG System Best Practices](https://docs.llamaindex.ai/en/stable/optimizing/evaluation/)

---

**Need Help?** Check the generated reports for detailed analysis and recommendations.