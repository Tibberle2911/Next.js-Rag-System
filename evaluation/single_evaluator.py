#!/usr/bin/env python3
"""
Single Test Case Evaluator
Runs a single test case with either basic or advanced RAG mode and returns results
"""

import asyncio
import os
import sys
import json
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Set UTF-8 encoding for stdout to handle Unicode characters
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add evaluation modules to path
sys.path.append(str(Path(__file__).parent))

# Import our evaluation modules with error handling
try:
    from rag_evaluator import RAGEvaluator, RAGTestCase
    from individual_metric_evaluator import IndividualMetricRAGEvaluator
    EVALUATOR_AVAILABLE = True
    INDIVIDUAL_METRICS_AVAILABLE = True
except ImportError as e:
    EVALUATOR_AVAILABLE = False
    INDIVIDUAL_METRICS_AVAILABLE = False
    print(f"ERROR:Failed to import RAG evaluator: {e}")
    sys.exit(1)

class SingleTestEvaluator:
    """Evaluator for single test cases"""
    
    def __init__(self, groq_api_key: str, rag_endpoint: str = "http://localhost:3000/api/chat"):
        self.groq_api_key = groq_api_key
        self.rag_endpoint = rag_endpoint
        self.evaluator = RAGEvaluator(groq_api_key)
        
        # Initialize individual metric evaluator for more accurate assessment
        if INDIVIDUAL_METRICS_AVAILABLE:
            try:
                self.individual_evaluator = IndividualMetricRAGEvaluator(groq_api_key)
                print("✅ Individual metric evaluator initialized for single tests")
            except Exception as e:
                print(f"⚠️ Individual metric evaluator initialization failed: {e}")
                self.individual_evaluator = None
        else:
            self.individual_evaluator = None
    
    def send_result(self, result: Dict[str, Any]):
        """Send result to API interface"""
        try:
            # Sanitize result for safe JSON encoding
            safe_result = self._sanitize_for_json(result)
            print(f"RESULT:{json.dumps(safe_result)}")
            sys.stdout.flush()
        except Exception as e:
            print(f"ERROR:Result send error: {str(e)}")
            sys.stdout.flush()
    
    def send_error(self, error: str):
        """Send error message to API interface"""
        try:
            safe_error = str(error).encode('utf-8', errors='replace').decode('utf-8')
            print(f"ERROR:{safe_error}")
            sys.stdout.flush()
        except Exception:
            print("ERROR:Unknown error occurred")
            sys.stdout.flush()
    
    def _sanitize_for_json(self, data: Any) -> Any:
        """Recursively sanitize data for JSON serialization with encoding safety"""
        if isinstance(data, dict):
            return {k: self._sanitize_for_json(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._sanitize_for_json(item) for item in data]
        elif isinstance(data, str):
            # Ensure string is safely encodable
            return data.encode('utf-8', errors='replace').decode('utf-8')
        else:
            return data
    
    async def evaluate_single_test(self, test_case_data: Dict[str, str], rag_mode: str) -> bool:
        """Evaluate a single test case with specified RAG mode"""
        try:
            # Create test case object with proper context keywords for consistency
            context_keywords = []
            if test_case_data['category'] == 'personal':
                context_keywords = ["myself", "background", "personal", "introduction"]
            elif test_case_data['category'] == 'experience':
                context_keywords = ["work", "experience", "job", "role", "company"]
            elif test_case_data['category'] == 'skills':
                context_keywords = ["programming", "languages", "coding", "development", "technical"]
            elif test_case_data['category'] == 'projects':
                context_keywords = ["projects", "built", "development", "technology"]
            elif test_case_data['category'] == 'education':
                context_keywords = ["education", "degree", "university", "study", "learning"]
            elif test_case_data['category'] == 'behaviour':
                context_keywords = ["behavior", "team", "work", "approach", "methodology"]
            
            test_case = RAGTestCase(
                question=test_case_data['question'],
                expected_answer=f"Expected answer for {test_case_data['category']} question about {test_case_data['difficulty']} difficulty",
                context_keywords=context_keywords,
                difficulty=test_case_data['difficulty'],
                category=test_case_data['category']
            )
            
            # Query RAG system
            rag_result = await self.evaluator.query_rag_system(test_case.question, rag_mode=rag_mode)
            
            # Use individual metric evaluation for more accurate assessment
            if self.individual_evaluator:
                print("🎯 Using individual metric evaluation for single test...")
                
                try:
                    # Run individual metric evaluation
                    evaluation = await self.individual_evaluator.evaluate_response(
                        question=test_case.question,
                        prediction=rag_result["answer"],
                        reference=test_case.expected_answer,
                        context=rag_result["contexts"]
                    )
                    
                    # Extract individual metric scores
                    criteria_scores = self.individual_evaluator.get_criteria_scores(evaluation)
                    
                    # Map to standard evaluation format
                    faithfulness_score = criteria_scores.get('factual_accuracy', 0.5)
                    answer_relevancy_score = criteria_scores.get('relevance', 0.5)
                    context_precision_score = criteria_scores.get('context_usage', 0.5)
                    context_recall_score = criteria_scores.get('completeness', 0.5)
                    context_relevancy_score = criteria_scores.get('context_usage', 0.5)
                    answer_correctness_score = evaluation.overall_score
                    
                    # Calculate overall score from all metrics
                    metric_scores = [
                        faithfulness_score,
                        answer_relevancy_score,
                        context_precision_score,
                        context_recall_score,
                        context_relevancy_score,
                        answer_correctness_score
                    ]
                    overall_score = sum(s for s in metric_scores if s > 0) / len([s for s in metric_scores if s > 0]) if any(s > 0 for s in metric_scores) else 0.0
                    
                    # Create result object with individual metric data
                    result = {
                        "answer": rag_result["answer"],
                        "generated_answer": rag_result["answer"],
                        "response_time": rag_result["response_time"],
                        "faithfulness": faithfulness_score,
                        "answer_relevancy": answer_relevancy_score,
                        "context_precision": context_precision_score,
                        "context_recall": context_recall_score,
                        "context_relevancy": context_relevancy_score,
                        "answer_correctness": answer_correctness_score,
                        "overall_score": overall_score,
                        "num_contexts": len(rag_result["contexts"]),
                        "rag_mode": rag_mode,
                        "question": test_case.question,
                        "category": test_case.category,
                        "difficulty": test_case.difficulty,
                        "techniques_used": rag_result.get("techniques_used", []),
                        # Add individual metric scores
                        "relevance": criteria_scores.get('relevance', 0.5),
                        "coherence": criteria_scores.get('coherence', 0.5),
                        "factual_accuracy": criteria_scores.get('factual_accuracy', 0.5),
                        "completeness": criteria_scores.get('completeness', 0.5),
                        "context_usage": criteria_scores.get('context_usage', 0.5),
                        "professional_tone": criteria_scores.get('professional_tone', 0.5),
                        "evaluation_method": "individual_metrics",
                        "individual_metric_details": {
                            metric_name: {
                                "score": metric_result.score,
                                "feedback": metric_result.feedback,
                                "evaluation_time": metric_result.evaluation_time
                            }
                            for metric_name, metric_result in evaluation.individual_metrics.items()
                        }
                    }
                    
                    print(f"✅ Individual metric evaluation completed:")
                    for metric_name, metric_result in evaluation.individual_metrics.items():
                        print(f"  {metric_name}: {metric_result.score:.3f}")
                    
                except Exception as e:
                    print(f"❌ Individual metric evaluation failed: {e}")
                    print("🔄 Falling back to standard RAGAS evaluation...")
                    
                    # Fallback to standard evaluation
                    individual_scores = await self.evaluator.evaluate_with_ragas([test_case], [rag_result])
                    if not individual_scores:
                        raise Exception("No evaluation scores returned from fallback")
                    
                    scores = individual_scores[0]
                    
                    # Extract standard scores
                    faithfulness_score = scores.get("faithfulness", 0.0)
                    answer_relevancy_score = scores.get("answer_relevancy", 0.0)
                    context_precision_score = scores.get("context_precision", 0.0)
                    context_recall_score = scores.get("context_recall", 0.0)
                    context_relevancy_score = scores.get("context_relevancy", 0.0)
                    answer_correctness_score = scores.get("answer_correctness", 0.0)
                    
                    # Calculate overall score
                    metric_scores = [
                        faithfulness_score,
                        answer_relevancy_score,
                        context_precision_score,
                        context_recall_score,
                        context_relevancy_score,
                        answer_correctness_score
                    ]
                    overall_score = sum(s for s in metric_scores if s > 0) / len([s for s in metric_scores if s > 0]) if any(s > 0 for s in metric_scores) else 0.0
                    
                    # Create fallback result
                    result = {
                        "answer": rag_result["answer"],
                        "generated_answer": rag_result["answer"],
                        "response_time": rag_result["response_time"],
                        "faithfulness": faithfulness_score,
                        "answer_relevancy": answer_relevancy_score,
                        "context_precision": context_precision_score,
                        "context_recall": context_recall_score,
                        "context_relevancy": context_relevancy_score,
                        "answer_correctness": answer_correctness_score,
                        "overall_score": overall_score,
                        "num_contexts": len(rag_result["contexts"]),
                        "rag_mode": rag_mode,
                        "question": test_case.question,
                        "category": test_case.category,
                        "difficulty": test_case.difficulty,
                        "techniques_used": rag_result.get("techniques_used", []),
                        "evaluation_method": scores.get('evaluation_method', 'fallback'),
                        "error": f"Individual metric evaluation failed: {str(e)}"
                    }
                    
                    # Add LangChain specific metrics if available
                    langchain_metrics = ['relevance', 'coherence', 'factual_accuracy', 'completeness', 'context_usage', 'professional_tone']
                    for metric in langchain_metrics:
                        if metric in scores:
                            result[metric] = scores[metric]
            else:
                print("🔄 Using standard RAGAS evaluation...")
                
                # Standard evaluation when individual metric evaluator not available
                individual_scores = await self.evaluator.evaluate_with_ragas([test_case], [rag_result])
                if not individual_scores:
                    raise Exception("No evaluation scores returned")
                
                scores = individual_scores[0]
                
                # Extract individual scores
                faithfulness_score = scores.get("faithfulness", 0.0)
                answer_relevancy_score = scores.get("answer_relevancy", 0.0)
                context_precision_score = scores.get("context_precision", 0.0)
                context_recall_score = scores.get("context_recall", 0.0)
                context_relevancy_score = scores.get("context_relevancy", 0.0)
                answer_correctness_score = scores.get("answer_correctness", 0.0)
                
                # Calculate overall score
                metric_scores = [
                    faithfulness_score,
                    answer_relevancy_score,
                    context_precision_score,
                    context_recall_score,
                    context_relevancy_score,
                    answer_correctness_score
                ]
                overall_score = sum(s for s in metric_scores if s > 0) / len([s for s in metric_scores if s > 0]) if any(s > 0 for s in metric_scores) else 0.0
                
                # Create result object
                result = {
                    "answer": rag_result["answer"],
                    "generated_answer": rag_result["answer"],
                    "response_time": rag_result["response_time"],
                    "faithfulness": faithfulness_score,
                    "answer_relevancy": answer_relevancy_score,
                    "context_precision": context_precision_score,
                    "context_recall": context_recall_score,
                    "context_relevancy": context_relevancy_score,
                    "answer_correctness": answer_correctness_score,
                    "overall_score": overall_score,
                    "num_contexts": len(rag_result["contexts"]),
                    "rag_mode": rag_mode,
                    "question": test_case.question,
                    "category": test_case.category,
                    "difficulty": test_case.difficulty,
                    "techniques_used": rag_result.get("techniques_used", [])
                }
                
                # Add LangChain specific metrics if available
                langchain_metrics = ['relevance', 'coherence', 'factual_accuracy', 'completeness', 'context_usage', 'professional_tone']
                for metric in langchain_metrics:
                    if metric in scores:
                        result[metric] = scores[metric]
                
                # Add evaluation method if available
                if 'evaluation_method' in scores:
                    result['evaluation_method'] = scores['evaluation_method']
                
                # Add error information if available
                if 'error' in scores:
                    result['error'] = scores['error']
            
            self.send_result(result)
            return True
            
        except Exception as e:
            self.send_error(f"Single test evaluation failed: {str(e)}")
            return False

async def main():
    """Main evaluation function"""
    
    try:
        # Check for GROQ API key
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            print("ERROR:GROQ_API_KEY not found in environment variables")
            return
        
        if not EVALUATOR_AVAILABLE:
            print("ERROR:RAG evaluator not available")
            return
        
        # Get parameters from command line arguments
        if len(sys.argv) != 3:
            print("ERROR:Usage: python single_evaluator.py <test_case_json> <rag_mode>")
            return
        
        test_case_json = sys.argv[1]
        rag_mode = sys.argv[2]
        
        try:
            test_case_data = json.loads(test_case_json)
        except json.JSONDecodeError as e:
            print(f"ERROR:Invalid test case JSON: {e}")
            return
        
        if rag_mode not in ['basic', 'advanced']:
            print(f"ERROR:Invalid RAG mode: {rag_mode}. Must be 'basic' or 'advanced'")
            return
        
        # Initialize evaluator with same endpoint configuration as batch evaluator
        rag_endpoint = "http://localhost:3000/api/chat"  # Consistent with batch evaluator
        evaluator = SingleTestEvaluator(groq_api_key, rag_endpoint)
        
        # Run single test evaluation
        success = await evaluator.evaluate_single_test(test_case_data, rag_mode)
        
        if not success:
            print("ERROR:Single test evaluation completed with errors")
            return
        
        # Success
        print("SUCCESS:Single test evaluation completed successfully")
        
    except Exception as e:
        print(f"ERROR:Unexpected error in main: {str(e)}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"ERROR:Fatal error: {str(e)}")
        sys.exit(1)