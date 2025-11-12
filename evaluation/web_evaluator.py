#!/usr/bin/env python3
"""
Web-based RAG Evaluator
Simplified evaluator that outputs JSON for web interface consumption
"""

import asyncio
import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Set UTF-8 encoding for stdout to handle Unicode characters
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add evaluation modules to path
sys.path.append(str(Path(__file__).parent))

# Import our evaluation modules with error handling
try:
    from rag_evaluator import RAGEvaluator
    EVALUATOR_AVAILABLE = True
except ImportError as e:
    EVALUATOR_AVAILABLE = False
    print(f"ERROR:Failed to import RAG evaluator: {e}")
    sys.exit(1)

class WebRAGEvaluator:
    """Streamlined RAG evaluator for web interface"""
    
    def __init__(self, groq_api_key: str, rag_endpoint: str = "http://localhost:3000/api/chat", rag_mode: str = "basic"):
        self.groq_api_key = groq_api_key
        self.rag_endpoint = rag_endpoint
        self.rag_mode = rag_mode  # 'basic' or 'advanced'
        self.evaluator = RAGEvaluator(groq_api_key)
        
    def send_progress(self, progress: float, status: str):
        """Send progress update to web interface"""
        try:
            # Ensure status is safely encodable
            safe_status = status.encode('utf-8', errors='replace').decode('utf-8')
            print(f"PROGRESS:{json.dumps({'progress': progress, 'status': safe_status})}")
            sys.stdout.flush()
        except Exception as e:
            print(f"ERROR:Progress send error: {str(e)}")
            sys.stdout.flush()
    
    def send_result(self, result: Dict[str, Any]):
        """Send individual result to web interface"""
        try:
            # Sanitize result for safe JSON encoding
            safe_result = self._sanitize_for_json(result)
            print(f"RESULT:{json.dumps(safe_result)}")
            sys.stdout.flush()
        except Exception as e:
            print(f"ERROR:Result send error: {str(e)}")
            sys.stdout.flush()
    
    def send_summary(self, summary: Dict[str, Any]):
        """Send evaluation summary to web interface"""
        try:
            # Sanitize summary for safe JSON encoding
            safe_summary = self._sanitize_for_json(summary)
            print(f"SUMMARY:{json.dumps(safe_summary)}")
            sys.stdout.flush()
        except Exception as e:
            print(f"ERROR:Summary send error: {str(e)}")
            sys.stdout.flush()
    
    def send_error(self, error: str):
        """Send error message to web interface"""
        try:
            # Ensure error message is safely encodable
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
    
    async def run_web_evaluation(self, category: str = None, rag_mode: str = None) -> bool:
        """Run evaluation and stream results to web interface"""
        try:
            # Update RAG mode if provided
            if rag_mode:
                self.rag_mode = rag_mode
                
            self.send_progress(5, f"Creating test dataset (RAG mode: {self.rag_mode})...")
            
            # Create test cases filtered by category if specified
            if category:
                test_cases = self.evaluator.get_test_cases_by_category(category)
                self.send_progress(10, f"Created {len(test_cases)} test cases for category: {category}")
            else:
                test_cases = self.evaluator.create_test_dataset()
                self.send_progress(10, f"Created {len(test_cases)} test cases")
            
            # Run each test case twice for comparison
            total_runs = len(test_cases) * 2
            
            # Query RAG system for all test cases (2 runs each)
            rag_results = []
            for i, test_case in enumerate(test_cases):
                # First run
                progress = 10 + ((i * 2) / total_runs) * 40  # 10% to 50%
                self.send_progress(progress, f"Querying RAG system ({self.rag_mode}): {test_case.category} question {i+1}/{len(test_cases)} (run 1)")
                
                try:
                    result1 = await self.evaluator.query_rag_system(test_case.question, rag_mode=self.rag_mode)
                    result1['run_number'] = 1
                    result1['test_case_index'] = i
                    result1['rag_mode'] = self.rag_mode
                    rag_results.append(result1)
                except Exception as e:
                    self.send_error(f"Failed to query RAG system for question {i+1} (run 1): {str(e)}")
                    return False
                
                # Add delay between first and second run to prevent rate limiting
                await asyncio.sleep(4.0)
                
                # Second run
                progress = 10 + ((i * 2 + 1) / total_runs) * 40
                self.send_progress(progress, f"Querying RAG system ({self.rag_mode}): {test_case.category} question {i+1}/{len(test_cases)} (run 2)")
                
                try:
                    result2 = await self.evaluator.query_rag_system(test_case.question, rag_mode=self.rag_mode)
                    result2['run_number'] = 2
                    result2['test_case_index'] = i
                    result2['rag_mode'] = self.rag_mode
                    rag_results.append(result2)
                except Exception as e:
                    self.send_error(f"Failed to query RAG system for question {i+1} (run 2): {str(e)}")
                    return False
                
                # Add delay between test cases to prevent rate limiting
                if i < len(test_cases) - 1:  # Don't wait after the last test case
                    await asyncio.sleep(4.0)
            
            self.send_progress(50, "Running GROQ-based evaluation...")
            
            # Evaluate with GROQ - need to pass rag_results twice for proper alignment
            # Since we have 2 runs per test case, create aligned test_cases list
            aligned_test_cases = []
            for test_case in test_cases:
                aligned_test_cases.extend([test_case, test_case])  # Add each test case twice
            
            try:
                individual_scores = await self.evaluator.evaluate_with_ragas(aligned_test_cases, rag_results)
            except Exception as e:
                self.send_error(f"GROQ evaluation failed: {str(e)}")
                return False
            
            self.send_progress(75, "Processing evaluation results...")
            
            # Process and send results - now we have individual scores for each test case
            results_data = []
            for i, (test_case, rag_result, scores) in enumerate(zip(aligned_test_cases, rag_results, individual_scores)):
                try:
                    # Extract evaluation method from scores
                    evaluation_method = scores.get("evaluation_method", "groq")
                    
                    # Extract individual scores for this test case based on evaluation method
                    if evaluation_method == "individual_metrics":
                        # Individual metric evaluator scores
                        faithfulness_score = scores.get("faithfulness", 0.0)
                        answer_relevancy_score = scores.get("answer_relevancy", 0.0) 
                        context_precision_score = scores.get("context_precision", 0.0)
                        context_recall_score = scores.get("context_recall", 0.0)
                        context_relevancy_score = scores.get("context_relevancy", 0.0)
                        answer_correctness_score = scores.get("answer_correctness", 0.0)
                        
                        # Include individual metric scores 
                        relevance_score = scores.get("relevance", 0.0)
                        coherence_score = scores.get("coherence", 0.0)
                        factual_accuracy_score = scores.get("factual_accuracy", 0.0)
                        completeness_score = scores.get("completeness", 0.0)
                        context_usage_score = scores.get("context_usage", 0.0)
                        professional_tone_score = scores.get("professional_tone", 0.0)
                        
                        # Calculate overall score from individual metrics (more comprehensive)
                        individual_metric_scores = [
                            relevance_score,
                            coherence_score,
                            factual_accuracy_score,
                            completeness_score,
                            context_usage_score,
                            professional_tone_score
                        ]
                        overall_score = sum(s for s in individual_metric_scores if s > 0) / len([s for s in individual_metric_scores if s > 0]) if any(s > 0 for s in individual_metric_scores) else 0.0
                        
                    elif evaluation_method == "langchain":
                        # LangChain evaluator scores
                        faithfulness_score = scores.get("faithfulness", 0.0)
                        answer_relevancy_score = scores.get("answer_relevancy", 0.0)
                        context_precision_score = scores.get("context_precision", 0.0)
                        context_recall_score = scores.get("context_recall", 0.0)
                        context_relevancy_score = scores.get("context_relevancy", 0.0)
                        answer_correctness_score = scores.get("answer_correctness", 0.0)
                        
                        # Include LangChain metric scores
                        relevance_score = scores.get("relevance", 0.0)
                        coherence_score = scores.get("coherence", 0.0)
                        factual_accuracy_score = scores.get("factual_accuracy", 0.0)
                        completeness_score = scores.get("completeness", 0.0)
                        context_usage_score = scores.get("context_usage", 0.0)
                        professional_tone_score = scores.get("professional_tone", 0.0)
                        
                        # Calculate overall score from LangChain metrics
                        langchain_metric_scores = [
                            relevance_score,
                            coherence_score,
                            factual_accuracy_score,
                            completeness_score,
                            context_usage_score,
                            professional_tone_score
                        ]
                        overall_score = sum(s for s in langchain_metric_scores if s > 0) / len([s for s in langchain_metric_scores if s > 0]) if any(s > 0 for s in langchain_metric_scores) else 0.0
                        
                    else:
                        # GROQ/RAGAS evaluator scores (fallback)
                        faithfulness_score = scores.get("faithfulness", 0.0)
                        answer_relevancy_score = scores.get("answer_relevancy", 0.0)
                        context_precision_score = scores.get("context_precision", 0.0)
                        context_recall_score = scores.get("context_recall", 0.0)
                        context_relevancy_score = scores.get("context_relevancy", 0.0)
                        answer_correctness_score = scores.get("answer_correctness", 0.0)
                        
                        # Set individual metrics to None for GROQ method
                        relevance_score = None
                        coherence_score = None
                        factual_accuracy_score = None
                        completeness_score = None
                        context_usage_score = None
                        professional_tone_score = None
                        
                        # Calculate overall score from GROQ metrics
                        groq_metric_scores = [
                            faithfulness_score,
                            answer_relevancy_score,
                            context_precision_score,
                            context_recall_score,
                            context_relevancy_score,
                            answer_correctness_score
                        ]
                        overall_score = sum(s for s in groq_metric_scores if s > 0) / len([s for s in groq_metric_scores if s > 0]) if any(s > 0 for s in groq_metric_scores) else 0.0
                    
                    result_data = {
                        "question": test_case.question,
                        "category": test_case.category,
                        "difficulty": test_case.difficulty,
                        "generated_answer": rag_result["answer"],
                        "response_time": rag_result["response_time"],
                        "rag_mode": rag_result.get("rag_mode", self.rag_mode),
                        "test_case_index": rag_result.get("test_case_index", i // 2),  # Which test case (0-4)
                        "run_number": rag_result.get("run_number", (i % 2) + 1),     # Which run (1 or 2)
                        "evaluation_method": evaluation_method,
                        # RAGAS/GROQ metrics (always included for backward compatibility)
                        "faithfulness": faithfulness_score,
                        "answer_relevancy": answer_relevancy_score,
                        "context_precision": context_precision_score,
                        "context_recall": context_recall_score,
                        "context_relevancy": context_relevancy_score,
                        "answer_correctness": answer_correctness_score,
                        # Individual/LangChain metrics (included when available)
                        "relevance": relevance_score,
                        "coherence": coherence_score,
                        "factual_accuracy": factual_accuracy_score,
                        "completeness": completeness_score,
                        "context_usage": context_usage_score,
                        "professional_tone": professional_tone_score,
                        # Calculated overall score
                        "overall_score": overall_score,
                        "num_contexts": len(rag_result["contexts"]),
                        # Metric source indicators
                        "metric_sources": {
                            "primary_evaluator": evaluation_method,
                            "available_metrics": {
                                "ragas_groq": ["faithfulness", "answer_relevancy", "context_precision", "context_recall", "context_relevancy", "answer_correctness"],
                                "individual_langchain": ["relevance", "coherence", "factual_accuracy", "completeness", "context_usage", "professional_tone"] if relevance_score is not None else []
                            }
                        }
                    }
                    
                    results_data.append(result_data)
                    self.send_result(result_data)
                except Exception as e:
                    self.send_error(f"Failed to process result {i+1}: {str(e)}")
                    # Continue processing other results instead of failing entirely
                    continue
            
            if not results_data:
                self.send_error("No results were successfully processed")
                return False
            
            self.send_progress(90, "Generating summary analysis...")
            
            # Create summary
            try:
                summary = self.create_summary(results_data)
                self.send_summary(summary)
            except Exception as e:
                self.send_error(f"Failed to create summary: {str(e)}")
                return False
            
            self.send_progress(100, "Evaluation completed successfully!")
            return True
            
        except Exception as e:
            self.send_error(f"Evaluation failed: {str(e)}")
            return False
    
    def create_summary(self, results_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create evaluation summary from results"""
        if not results_data:
            return {}
        
        # Calculate averages
        total_cases = len(results_data)
        avg_overall_score = sum(r["overall_score"] for r in results_data) / total_cases
        avg_response_time = sum(r["response_time"] for r in results_data) / total_cases
        
        # Category performance
        categories = {}
        for result in results_data:
            cat = result["category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(result["overall_score"])
        
        category_averages = {cat: sum(scores)/len(scores) for cat, scores in categories.items()}
        
        # Determine which metrics are available
        evaluation_methods = list(set(r.get("evaluation_method", "groq") for r in results_data))
        has_individual_metrics = any(r.get("relevance") is not None for r in results_data)
        
        # Comprehensive metric averages - include all available metrics
        base_metrics = {
            "faithfulness": sum(r["faithfulness"] for r in results_data) / total_cases,
            "answer_relevancy": sum(r["answer_relevancy"] for r in results_data) / total_cases,
            "context_precision": sum(r["context_precision"] for r in results_data) / total_cases,
            "context_recall": sum(r["context_recall"] for r in results_data) / total_cases,
            "context_relevancy": sum(r["context_relevancy"] for r in results_data) / total_cases,
            "answer_correctness": sum(r["answer_correctness"] for r in results_data) / total_cases
        }
        
        # Add individual/LangChain metrics if available
        individual_metrics = {}
        if has_individual_metrics:
            valid_relevance = [r["relevance"] for r in results_data if r.get("relevance") is not None]
            valid_coherence = [r["coherence"] for r in results_data if r.get("coherence") is not None]
            valid_factual_accuracy = [r["factual_accuracy"] for r in results_data if r.get("factual_accuracy") is not None]
            valid_completeness = [r["completeness"] for r in results_data if r.get("completeness") is not None]
            valid_context_usage = [r["context_usage"] for r in results_data if r.get("context_usage") is not None]
            valid_professional_tone = [r["professional_tone"] for r in results_data if r.get("professional_tone") is not None]
            
            if valid_relevance:
                individual_metrics["relevance"] = sum(valid_relevance) / len(valid_relevance)
            if valid_coherence:
                individual_metrics["coherence"] = sum(valid_coherence) / len(valid_coherence)
            if valid_factual_accuracy:
                individual_metrics["factual_accuracy"] = sum(valid_factual_accuracy) / len(valid_factual_accuracy)
            if valid_completeness:
                individual_metrics["completeness"] = sum(valid_completeness) / len(valid_completeness)
            if valid_context_usage:
                individual_metrics["context_usage"] = sum(valid_context_usage) / len(valid_context_usage)
            if valid_professional_tone:
                individual_metrics["professional_tone"] = sum(valid_professional_tone) / len(valid_professional_tone)
        
        # Combine all metrics
        all_metrics = {**base_metrics, **individual_metrics}
        
        # Performance by category with standard deviation
        performance_by_category = {}
        for cat, scores in categories.items():
            mean_score = sum(scores) / len(scores)
            std_score = (sum((s - mean_score) ** 2 for s in scores) / len(scores)) ** 0.5 if len(scores) > 1 else 0.0
            performance_by_category[cat] = {
                "mean": mean_score,
                "std": std_score
            }
        
        # Performance by evaluation method
        method_performance = {}
        for method in evaluation_methods:
            method_results = [r for r in results_data if r.get("evaluation_method") == method]
            if method_results:
                method_scores = [r["overall_score"] for r in method_results]
                method_performance[method] = {
                    "count": len(method_results),
                    "mean": sum(method_scores) / len(method_scores),
                    "std": (sum((s - (sum(method_scores) / len(method_scores))) ** 2 for s in method_scores) / len(method_scores)) ** 0.5 if len(method_scores) > 1 else 0.0
                }
        
        return {
            "total_cases": total_cases,
            "avg_overall_score": avg_overall_score,
            "avg_response_time": avg_response_time,
            "metrics": all_metrics,  # Now includes both base and individual metrics
            "performance_by_category": performance_by_category,
            "category_averages": category_averages,
            "evaluation_methods": evaluation_methods,
            "method_performance": method_performance,
            "metric_coverage": {
                "has_individual_metrics": has_individual_metrics,
                "available_base_metrics": list(base_metrics.keys()),
                "available_individual_metrics": list(individual_metrics.keys()) if individual_metrics else [],
                "total_unique_metrics": len(all_metrics)
            }
        }

async def main():
    """Main web evaluation function"""
    
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
        category = None
        rag_mode = "basic"  # default to basic
        
        if len(sys.argv) > 1:
            category = sys.argv[1]
        if len(sys.argv) > 2:
            rag_mode = sys.argv[2]
        
        # Initialize web evaluator
        web_evaluator = WebRAGEvaluator(groq_api_key, rag_mode=rag_mode)
        
        # Run evaluation with optional category filter and RAG mode
        success = await web_evaluator.run_web_evaluation(category, rag_mode)
        
        if not success:
            print("ERROR:Evaluation completed with errors")
            # Don't exit with code 1 for web interface - let the frontend handle errors
            return
        
        # Success
        print("SUCCESS:Evaluation completed successfully")
        
    except Exception as e:
        print(f"ERROR:Unexpected error in main: {str(e)}")
        # Don't exit with code 1 - send error through the normal channel

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"ERROR:Fatal error: {str(e)}")
        # Only exit with code 1 for truly fatal errors
        sys.exit(1)