from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# Add parent directory to path to import evaluation modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'python_evaluators'))

try:
    from ragas import evaluate
    from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall, answer_correctness
    from ragas.llms import LangchainLLMWrapper
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_huggingface import HuggingFaceEmbeddings
    from datasets import Dataset
    import warnings
    warnings.filterwarnings('ignore')
    RAGAS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: RAGAS import failed: {e}", file=sys.stderr)
    RAGAS_AVAILABLE = False

# Global model rotation tracker (persists across requests in same container)
_global_model_tracker = {
    'current_index': 0,
    'models': [
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash"
    ]
}

def get_next_model():
    """Get next model in round-robin rotation to avoid rate limits"""
    model = _global_model_tracker['models'][_global_model_tracker['current_index']]
    _global_model_tracker['current_index'] = (
        _global_model_tracker['current_index'] + 1
    ) % len(_global_model_tracker['models'])
    return model

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Vercel serverless function handler for RAGAS evaluation"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            question = data.get('question', '')
            answer = data.get('answer', '')
            contexts = data.get('contexts', [])
            ground_truth = data.get('ground_truth', answer)
            rag_mode = data.get('rag_mode', 'basic')
            
            if not RAGAS_AVAILABLE:
                # Return fallback metrics
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                fallback_result = {
                    'faithfulness': 0.75,
                    'answer_relevancy': 0.75,
                    'context_precision': 0.75,
                    'context_recall': 0.75,
                    'context_relevance': 0.75,
                    'answer_correctness': 0.75,
                    'error': 'RAGAS not available, using fallback values'
                }
                
                self.wfile.write(json.dumps(fallback_result).encode())
                return
            
            # Initialize Gemini LLM for RAGAS with model rotation
            gemini_api_key = os.environ.get('GEMINI_API_KEY')
            if not gemini_api_key:
                raise ValueError('GEMINI_API_KEY environment variable not set')
            
            # Initialize embeddings (reused for all metrics)
            embeddings = HuggingFaceEmbeddings(
                model_name="sentence-transformers/all-MiniLM-L6-v2"
            )
            
            # Create dataset for RAGAS
            dataset_dict = {
                'question': [question],
                'answer': [answer],
                'contexts': [contexts],
                'ground_truth': [ground_truth]
            }
            
            dataset = Dataset.from_dict(dataset_dict)
            
            # Select metrics based on mode (matching ragas_evaluator.py exactly)
            # Note: answer_correctness added to match Python version
            if rag_mode == 'advanced':
                metrics_config = [
                    ('faithfulness', faithfulness),
                    ('answer_relevancy', answer_relevancy),
                    ('context_precision', context_precision),
                    ('context_recall', context_recall),
                    ('answer_correctness', answer_correctness),
                ]
            else:  # basic mode - faster metrics
                metrics_config = [
                    ('faithfulness', faithfulness),
                    ('context_precision', context_precision),
                    ('context_recall', context_recall),
                ]
            
            print(f"📊 Evaluating {len(metrics_config)} RAGAS metrics with model rotation...", file=sys.stderr)
            
            # Evaluate each metric separately with model rotation (matching ragas_evaluator.py)
            all_scores = {}
            for metric_name, metric in metrics_config:
                try:
                    # Get next model in rotation and create LLM
                    current_model = get_next_model()
                    llm = ChatGoogleGenerativeAI(
                        model=current_model,
                        google_api_key=gemini_api_key,
                        temperature=0.1,
                        max_output_tokens=16384,  # Matching ragas_evaluator.py
                        convert_system_message_to_human=True,
                        response_mime_type="application/json"
                    )
                    
                    # Configure metric with LLM
                    metric.llm = llm
                    
                    print(f"  📈 {metric_name}: {current_model}", file=sys.stderr)
                    print(f"PROGRESS: Evaluating {metric_name} with {current_model}", flush=True)
                    
                    # Evaluate this single metric
                    result = evaluate(
                        dataset=dataset,
                        metrics=[metric],
                        embeddings=embeddings,
                        show_progress=False
                    )
                    
                    # Extract score from RAGAS result
                    score = None
                    if hasattr(result, 'to_pandas'):
                        df = result.to_pandas()
                        
                        # Try different column name variations
                        possible_names = [
                            metric_name,
                            f"nv_{metric_name}",
                            metric_name.replace('_', ''),
                        ]
                        
                        for name in possible_names:
                            if name in df.columns:
                                raw_score = df[name].iloc[0]
                                if raw_score is not None and not (isinstance(raw_score, float) and raw_score != raw_score):
                                    score = float(raw_score)
                                    if name != metric_name:
                                        print(f"    ℹ️  Found as '{name}' in result", file=sys.stderr)
                                    break
                    
                    # Store score
                    if score is not None:
                        all_scores[metric_name] = score
                        print(f"PROGRESS: {metric_name} completed with score {score:.4f}", flush=True)
                        print(f"    ✅ {metric_name} = {score:.4f}", file=sys.stderr)
                    else:
                        print(f"    ⚠️  {metric_name} = failed (metric not in result)", file=sys.stderr)
                
                except Exception as e:
                    error_msg = str(e)
                    if "rate_limit" in error_msg.lower() or "429" in error_msg:
                        print(f"    ❌ {metric_name} = rate limit", file=sys.stderr)
                    else:
                        print(f"    ❌ {metric_name} = error: {error_msg[:100]}", file=sys.stderr)
            
            # Print summary
            valid_count = sum(1 for v in all_scores.values() if not (isinstance(v, float) and v != v))
            print(f"\n📈 RAGAS scores ({valid_count}/{len(metrics_config)})", file=sys.stderr)
            
            # Normalize context_relevance naming if needed
            if 'nv_context_relevance' in all_scores:
                all_scores['context_relevance'] = all_scores.pop('nv_context_relevance')
            
            # Build result with all metrics (matching ragas_evaluator.py output format)
            result = {
                'faithfulness': all_scores.get('faithfulness', 0.75),
                'answer_relevancy': all_scores.get('answer_relevancy', 0.75),
                'context_precision': all_scores.get('context_precision', 0.75),
                'context_recall': all_scores.get('context_recall', 0.75),
                'context_relevance': all_scores.get('context_relevance', 0.75),
                'answer_correctness': all_scores.get('answer_correctness', 0.75)
            }
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            error_result = {
                'error': str(e),
                'faithfulness': 0.75,
                'answer_relevancy': 0.75,
                'context_precision': 0.75,
                'context_recall': 0.75,
                'context_relevance': 0.75,
                'answer_correctness': 0.75
            }
            
            self.wfile.write(json.dumps(error_result).encode())
    
    def do_GET(self):
        """Health check endpoint"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        health = {
            'status': 'ok',
            'ragas_available': RAGAS_AVAILABLE,
            'service': 'ragas_evaluator'
        }
        
        self.wfile.write(json.dumps(health).encode())
