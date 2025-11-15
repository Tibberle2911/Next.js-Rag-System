"""
RAGAS Framework Integration - Primary Metrics Source (v2 - Sequential with Multi-Key Rotation)
Uses authentic RAGAS library with intelligent key rotation to maximize throughput
"""
import os
import json
import sys
from typing import List, Dict, Any
import asyncio
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# RAGAS imports
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
    ContextRelevance,
    answer_correctness
)

# Dataset creation
from datasets import Dataset

# LangChain for LLM integration
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings

# ============================================================================
# PATCH 1: Fix answer_relevancy "n must be at most 1" bug with Groq
# ============================================================================
def patch_answer_relevancy_for_groq():
    """
    Monkey-patch RAGAS answer_relevancy to fix Groq API compatibility issue.
    The bug: RAGAS passes n>1 to generate() but Groq only accepts n=1
    """
    try:
        from ragas.metrics._answer_relevance import AnswerRelevancy
        original_generate = answer_relevancy.llm.generate if hasattr(answer_relevancy, 'llm') else None
        
        if original_generate:
            def patched_generate(prompts, **kwargs):
                # Force n=1 for Groq compatibility
                if 'n' in kwargs and kwargs['n'] > 1:
                    print(f"  🔧 Patching answer_relevancy: n={kwargs['n']} → n=1 (Groq requirement)", file=sys.stderr)
                    kwargs['n'] = 1
                return original_generate(prompts, **kwargs)
            
            answer_relevancy.llm.generate = patched_generate
            print("✅ Applied answer_relevancy Groq compatibility patch", file=sys.stderr)
            return True
    except Exception as e:
        print(f"⚠️  Could not patch answer_relevancy: {e}", file=sys.stderr)
    return False

# ============================================================================
# PATCH 2: Fix context_relevance missing metric issue
# ============================================================================
def patch_context_relevance():
    """
    Ensure context_relevance metric returns valid results.
    Common issue: metric name mismatch (nv_context_relevance vs context_relevance)
    """
    try:
        from ragas.metrics import ContextRelevance
        print("✅ ContextRelevance metric loaded successfully", file=sys.stderr)
        return True
    except Exception as e:
        print(f"⚠️  Could not verify ContextRelevance: {e}", file=sys.stderr)
    return False

# Global key tracking to persist across evaluator instances
_global_key_tracker = {
    'current_index': 0,
    'last_used': {}  # idx -> timestamp
}

class RAGASEvaluator:
    def __init__(self):
        """
        Initialize RAGAS evaluator with multi-model rotation to avoid rate limits
        Rotates through 4 Gemini models for different metrics
        """
        # Load Gemini API key
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # Define 4 models for rotation to avoid 429 rate limit errors
        # Using stable models verified to work with LangChain and RAGAS
        self.models = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash"
        ]
        
        self.current_model_index = 0
        genai.configure(api_key=self.gemini_api_key)
        
        print(f"🔑 Using Gemini API with {len(self.models)} models for rotation", file=sys.stderr)
        print(f"📋 Models: {', '.join(self.models)}", file=sys.stderr)
        print(f"⚡ Strategy: Round-robin across metrics to avoid rate limits", file=sys.stderr)
        
        
        # Initialize embeddings once
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    
    def _get_next_model(self) -> str:
        """Get next model in rotation (round-robin)"""
        model = self.models[self.current_model_index]
        self.current_model_index = (self.current_model_index + 1) % len(self.models)
        return model
    
    def _create_llm(self, model_name: str = None) -> ChatGoogleGenerativeAI:
        """Create LangChain LLM wrapper for RAGAS metrics"""
        if model_name is None:
            model_name = self._get_next_model()
        
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=self.gemini_api_key,
            temperature=0.1,
            max_output_tokens=16384,  # Increased to 16K to handle very large JSON responses
            convert_system_message_to_human=True,  # Fix for RAGAS compatibility
            response_mime_type="application/json"  # Force JSON output without markdown
        )
    
    async def _call_gemini(self, prompt: str, model_name: str = None) -> str:
        """
        Call Gemini API with the specified or next available model
        """
        if model_name is None:
            model_name = self._get_next_model()
            
        try:
            model = genai.GenerativeModel(model_name)
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=4096
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"❌ Gemini API error with {model_name}: {e}", file=sys.stderr)
            raise

    async def evaluate_single(
        self, 
        question: str, 
        answer: str, 
        contexts: List[str], 
        ground_truth: str = None,
        rag_mode: str = 'basic'
    ) -> Dict[str, float]:
        """
        Evaluate using RAGAS with model rotation across metrics
        """
        print(f"\n🔄 [{rag_mode.upper()}] Starting evaluation with model rotation", file=sys.stderr)
        
        # Run evaluation
        result = await self._run_evaluation(
            question, answer, contexts, ground_truth, rag_mode
        )
        
        print(f"✅ [{rag_mode.upper()}] Completed with {len(result)} metrics", file=sys.stderr)
        return result
    
    async def _run_evaluation(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        ground_truth: str,
        rag_mode: str
    ) -> Dict[str, float]:
        """Run RAGAS evaluation with all metrics using Gemini"""
        try:
            # Create dataset (reused for all metrics)
            dataset_dict = {
                'question': [question],
                'answer': [answer],
                'contexts': [contexts],
                'ground_truth': [ground_truth] if ground_truth else [answer]
            }
            dataset = Dataset.from_dict(dataset_dict)
            
            # 5 metrics - each will use a different model with LangChain wrapper
            # Using Gemini models which support answer_relevancy better than Groq
            # Note: context_relevance removed due to compatibility issues
            # context_relevance fails with 'ChatGoogleGenerativeAI' object has no attribute 'agenerate_text'
            metrics_config = [
                ('faithfulness', faithfulness),
                ('answer_relevancy', answer_relevancy),
                ('context_precision', context_precision),
                ('context_recall', context_recall),
                ('answer_correctness', answer_correctness),
            ]
            
            print(f"📊 Evaluating {len(metrics_config)} RAGAS metrics (rotating models)...", file=sys.stderr)
            
            # Evaluate each metric separately with model rotation
            all_scores = {}
            for metric_name, metric in metrics_config:
                try:
                    # Get next model in rotation and create LLM
                    current_model = self._get_next_model()
                    llm = self._create_llm(current_model)
                    
                    # Configure metric with LLM
                    metric.llm = llm
                    
                    # Print progress to stdout for frontend capture
                    print(f"PROGRESS: Evaluating {metric_name} with {current_model}", flush=True)
                    print(f"  📈 {metric_name}: {current_model}", file=sys.stderr)
                    
                    # Suppress RAGAS warnings/errors that would interfere with JSON output
                    import warnings
                    warnings.filterwarnings('ignore')
                    
                    # Evaluate this single metric with timeout protection
                    # Note: RAGAS will use the model configured in the metric itself
                    result = evaluate(
                        dataset=dataset,
                        metrics=[metric],
                        embeddings=self.embeddings,
                        show_progress=False  # Disable RAGAS progress bar on stdout
                    )
                    
                    # Extract score from RAGAS result (handle multiple naming conventions)
                    score = None
                    actual_metric_name = metric_name
                    
                    if hasattr(result, 'to_pandas'):
                        df = result.to_pandas()
                        
                        # Try different column name variations
                        possible_names = [
                            metric_name,
                            f"nv_{metric_name}",  # NVIDIA/Nemo Curator prefix
                            metric_name.replace('_', ''),  # no underscore
                        ]
                        
                        for name in possible_names:
                            if name in df.columns:
                                actual_metric_name = name
                                raw_score = df[name].iloc[0]
                                # Handle NaN, None, and valid numbers
                                if raw_score is not None and not (isinstance(raw_score, float) and raw_score != raw_score):
                                    score = float(raw_score)
                                    if name != metric_name:
                                        print(f"    ℹ️  Found as '{name}' in result", file=sys.stderr)
                                else:
                                    print(f"    ⚠️  {metric_name} = NaN (LLM returned invalid response)", file=sys.stderr)
                                break
                        
                        if score is None and actual_metric_name == metric_name:
                            print(f"    ⚠️  {metric_name} columns available: {list(df.columns)}", file=sys.stderr)
                            
                    elif hasattr(result, '__dict__'):
                        raw_score = getattr(result, metric_name, None)
                        if raw_score is not None and not (isinstance(raw_score, float) and raw_score != raw_score):
                            score = float(raw_score)
                    elif isinstance(result, dict) and metric_name in result:
                        raw_score = result[metric_name]
                        if raw_score is not None and not (isinstance(raw_score, float) and raw_score != raw_score):
                            score = float(raw_score)
                    
                    # Store score (None if failed)
                    if score is not None:
                        all_scores[metric_name] = score
                        print(f"PROGRESS: {metric_name} completed with score {score:.4f}", flush=True)
                        print(f"    ✅ {metric_name} = {score:.4f}", file=sys.stderr)
                    else:
                        if score is None and hasattr(result, 'to_pandas'):
                            print(f"    ⚠️  {metric_name} = failed (metric not in result)", file=sys.stderr)
                        else:
                            print(f"    ⚠️  {metric_name} = failed (unknown extraction error)", file=sys.stderr)
                
                except TimeoutError as e:
                    print(f"    ❌ {metric_name} = timeout (LLM took too long)", file=sys.stderr)
                except Exception as e:
                    error_msg = str(e)
                    if "BadRequestError" in error_msg or "'n' : number must be at most 1" in error_msg:
                        print(f"    ❌ {metric_name} = API error (invalid parameter 'n')", file=sys.stderr)
                    elif "rate_limit" in error_msg.lower() or "429" in error_msg:
                        print(f"    ❌ {metric_name} = rate limit (too many requests)", file=sys.stderr)
                    else:
                        print(f"    ❌ {metric_name} = error: {error_msg[:100]}", file=sys.stderr)
            
            # Print summary
            valid_count = sum(1 for v in all_scores.values() if not (isinstance(v, float) and v != v))  # Count non-NaN
            failed_count = len(metrics_config) - valid_count
            print(f"\n📈 RAGAS scores ({valid_count}/{len(metrics_config)})", file=sys.stderr)
            
            if failed_count > 0:
                print(f"\n⚠️  {failed_count} metric(s) failed. Common causes:", file=sys.stderr)
                print(f"   1. Timeouts: LLM took >3 minutes to respond", file=sys.stderr)
                print(f"   2. Rate limits: Too many requests (should be rare with 4-model rotation)", file=sys.stderr)
                print(f"   3. Invalid JSON: LLM returned malformed response", file=sys.stderr)
                print(f"   💡 Tip: Failed metrics are excluded from overall score calculation", file=sys.stderr)
            
            # Normalize context_relevance naming if needed
            if 'nv_context_relevance' in all_scores:
                all_scores['context_relevance'] = all_scores.pop('nv_context_relevance')
            
            return all_scores
            
        except Exception as e:
            print(f"❌ Evaluation error: {e}", file=sys.stderr)
            raise

async def main():
    """CLI interface"""
    if len(sys.argv) < 2:
        print("Usage: python ragas_evaluator.py <json_input>")
        sys.exit(1)
    
    try:
        input_data = json.loads(sys.argv[1])
        
        evaluator = RAGASEvaluator()
        
        results = await evaluator.evaluate_single(
            question=input_data.get('question', ''),
            answer=input_data.get('answer', ''),
            contexts=input_data.get('contexts', []),
            ground_truth=input_data.get('ground_truth'),
            rag_mode=input_data.get('rag_mode', 'basic')
        )
        
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
