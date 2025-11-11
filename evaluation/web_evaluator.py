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
    
    def __init__(self, groq_api_key: str, rag_endpoint: str = "http://localhost:3000/api/chat"):
        self.groq_api_key = groq_api_key
        self.rag_endpoint = rag_endpoint
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
    
    async def run_web_evaluation(self, category: str = None) -> bool:
        """Run evaluation and stream results to web interface"""
        try:
            self.send_progress(5, "Creating test dataset...")
            
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
                self.send_progress(progress, f"Querying RAG system: {test_case.category} question {i+1}/{len(test_cases)} (run 1)")
                
                try:
                    result1 = await self.evaluator.query_rag_system(test_case.question)
                    result1['run_number'] = 1
                    result1['test_case_index'] = i
                    rag_results.append(result1)
                except Exception as e:
                    self.send_error(f"Failed to query RAG system for question {i+1} (run 1): {str(e)}")
                    return False
                
                # Second run
                progress = 10 + ((i * 2 + 1) / total_runs) * 40
                self.send_progress(progress, f"Querying RAG system: {test_case.category} question {i+1}/{len(test_cases)} (run 2)")
                
                try:
                    result2 = await self.evaluator.query_rag_system(test_case.question)
                    result2['run_number'] = 2
                    result2['test_case_index'] = i
                    rag_results.append(result2)
                except Exception as e:
                    self.send_error(f"Failed to query RAG system for question {i+1} (run 2): {str(e)}")
                    return False
            
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
                    # Extract individual scores for this test case
                    faithfulness_score = scores.get("faithfulness", 0.0)
                    answer_relevancy_score = scores.get("answer_relevancy", 0.0)
                    context_precision_score = scores.get("context_precision", 0.0)
                    context_recall_score = scores.get("context_recall", 0.0)
                    context_relevancy_score = scores.get("context_relevancy", 0.0)
                    answer_correctness_score = scores.get("answer_correctness", 0.0)
                    
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
                    
                    result_data = {
                        "question": test_case.question,
                        "category": test_case.category,
                        "difficulty": test_case.difficulty,
                        "generated_answer": rag_result["answer"],
                        "response_time": rag_result["response_time"],
                        "test_case_index": rag_result.get("test_case_index", i // 2),  # Which test case (0-4)
                        "run_number": rag_result.get("run_number", (i % 2) + 1),     # Which run (1 or 2)
                        "faithfulness": faithfulness_score,
                        "answer_relevancy": answer_relevancy_score,
                        "context_precision": context_precision_score,
                        "context_recall": context_recall_score,
                        "context_relevancy": context_relevancy_score,
                        "answer_correctness": answer_correctness_score,
                        "overall_score": overall_score,
                        "num_contexts": len(rag_result["contexts"])
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
        
        # Metric averages - include all 7 metrics
        metrics = {
            "faithfulness": sum(r["faithfulness"] for r in results_data) / total_cases,
            "answer_relevancy": sum(r["answer_relevancy"] for r in results_data) / total_cases,
            "context_precision": sum(r["context_precision"] for r in results_data) / total_cases,
            "context_recall": sum(r["context_recall"] for r in results_data) / total_cases,
            "context_relevancy": sum(r["context_relevancy"] for r in results_data) / total_cases,
            "answer_correctness": sum(r["answer_correctness"] for r in results_data) / total_cases
        }
        
        # Performance by category
        performance_by_category = {}
        for cat, scores in categories.items():
            mean_score = sum(scores) / len(scores)
            std_score = (sum((s - mean_score) ** 2 for s in scores) / len(scores)) ** 0.5
            performance_by_category[cat] = {
                "mean": mean_score,
                "std": std_score
            }
        
        return {
            "total_cases": total_cases,
            "avg_overall_score": avg_overall_score,
            "avg_response_time": avg_response_time,
            "metrics": metrics,
            "performance_by_category": performance_by_category,
            "category_averages": category_averages
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
        
        # Get category from command line argument
        category = None
        if len(sys.argv) > 1:
            category = sys.argv[1]
        
        # Initialize web evaluator
        web_evaluator = WebRAGEvaluator(groq_api_key)
        
        # Run evaluation with optional category filter
        success = await web_evaluator.run_web_evaluation(category)
        
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