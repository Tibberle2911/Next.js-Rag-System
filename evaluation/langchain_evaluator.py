"""
LangChain Integration for Advanced RAG Evaluation
Comprehensive testing using LangChain evaluation framework
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import time

# LangChain Core
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough

# LangChain Evaluation (using modern approach)
try:
    from langchain.evaluation import (
        load_evaluator,
        EvaluatorType,
        Criteria
    )
except ImportError:
    # Fallback for newer versions
    try:
        from langchain_community.evaluation import (
            load_evaluator,
            EvaluatorType,
            Criteria
        )
    except ImportError:
        # Define minimal fallback
        class EvaluatorType:
            CRITERIA = "criteria"
            PAIRWISE_STRING = "pairwise_string"
            
        class Criteria:
            CONCISENESS = "conciseness"
            RELEVANCE = "relevance" 
            CORRECTNESS = "correctness"
            COHERENCE = "coherence"
            HARMFULNESS = "harmfulness"
            
        def load_evaluator(*args, **kwargs):
            raise ImportError("LangChain evaluator not available")

# LangChain Groq Integration  
from langchain_groq import ChatGroq

# Custom Evaluation Metrics
try:
    from langchain.evaluation.criteria import LabeledCriteriaEvalChain
except ImportError:
    try:
        from langchain_community.evaluation.criteria import LabeledCriteriaEvalChain
    except ImportError:
        # Simple fallback class
        class LabeledCriteriaEvalChain:
            def __init__(self, *args, **kwargs):
                pass

# Async HTTP client for RAG system
import aiohttp

@dataclass 
class LangChainEvaluation:
    """LangChain-based evaluation result"""
    question: str
    prediction: str
    reference: str
    criteria_scores: Dict[str, float]
    reasoning: str
    overall_score: float
    evaluation_time: float

class LangChainRAGEvaluator:
    """Advanced RAG evaluation using LangChain framework"""
    
    def __init__(self, groq_api_key: str, rag_endpoint: str = "http://localhost:3000/api/chat"):
        self.groq_api_key = groq_api_key
        self.rag_endpoint = rag_endpoint
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant",
            temperature=0.1
        )
        
        # Initialize evaluators
        self.setup_evaluators()
        
    def setup_evaluators(self):
        """Setup various LangChain evaluators"""
        
        # Standard evaluators
        self.relevance_evaluator = load_evaluator(
            EvaluatorType.CRITERIA,
            criteria=Criteria.RELEVANCE,
            llm=self.llm
        )
        
        self.coherence_evaluator = load_evaluator(
            EvaluatorType.CRITERIA,
            criteria=Criteria.COHERENCE,
            llm=self.llm
        )
        
        self.harmfulness_evaluator = load_evaluator(
            EvaluatorType.CRITERIA,
            criteria=Criteria.HARMFULNESS,
            llm=self.llm
        )
        
        # Custom criteria for RAG evaluation
        self.custom_evaluators = {
            "factual_accuracy": load_evaluator(
                EvaluatorType.LABELED_CRITERIA,
                criteria={
                    "factual_accuracy": "Is the response factually accurate based on the given context? Does it contain any false or misleading information?"
                },
                llm=self.llm
            ),
            
            "completeness": load_evaluator(
                EvaluatorType.LABELED_CRITERIA,
                criteria={
                    "completeness": "Does the response comprehensively address all aspects of the question? Are there any important missing details?"
                },
                llm=self.llm
            ),
            
            "context_usage": load_evaluator(
                EvaluatorType.LABELED_CRITERIA,
                criteria={
                    "context_usage": "How well does the response utilize the provided context? Does it stay grounded in the given information?"
                },
                llm=self.llm
            ),
            
            "professional_tone": load_evaluator(
                EvaluatorType.LABELED_CRITERIA,
                criteria={
                    "professional_tone": "Is the response written in a professional, interview-appropriate tone suitable for a digital twin?"
                },
                llm=self.llm
            )
        }
    
    async def query_rag_system(self, question: str) -> Dict[str, Any]:
        """Query the RAG system asynchronously"""
        
        async with aiohttp.ClientSession() as session:
            try:
                start_time = time.time()
                
                async with session.post(
                    self.rag_endpoint,
                    json={"message": question},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    
                    response_time = time.time() - start_time
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "answer": data.get("message", ""),
                            "sources": data.get("sources", []),
                            "response_time": response_time,
                            "success": True
                        }
                    else:
                        return {
                            "answer": f"HTTP Error: {response.status}",
                            "sources": [],
                            "response_time": response_time,
                            "success": False
                        }
                        
            except Exception as e:
                return {
                    "answer": f"Connection Error: {str(e)}",
                    "sources": [],
                    "response_time": 0,
                    "success": False
                }
    
    async def evaluate_response(self, question: str, prediction: str, reference: str, context: List[str]) -> LangChainEvaluation:
        """Comprehensive evaluation of a single response"""
        
        start_time = time.time()
        criteria_scores = {}
        all_reasoning = []
        
        # Standard criteria evaluation
        try:
            relevance_result = await self.relevance_evaluator.aevaluate_strings(
                prediction=prediction,
                input=question
            )
            criteria_scores["relevance"] = relevance_result["score"]
            all_reasoning.append(f"Relevance: {relevance_result.get('reasoning', '')}")
        except Exception as e:
            print(f"Relevance evaluation error: {e}")
            criteria_scores["relevance"] = 0.5
        
        try:
            coherence_result = await self.coherence_evaluator.aevaluate_strings(
                prediction=prediction,
                input=question  
            )
            criteria_scores["coherence"] = coherence_result["score"]
            all_reasoning.append(f"Coherence: {coherence_result.get('reasoning', '')}")
        except Exception as e:
            print(f"Coherence evaluation error: {e}")
            criteria_scores["coherence"] = 0.5
        
        try:
            harmfulness_result = await self.harmfulness_evaluator.aevaluate_strings(
                prediction=prediction,
                input=question
            )
            criteria_scores["harmfulness"] = 1.0 - harmfulness_result["score"]  # Invert for positive scoring
            all_reasoning.append(f"Harmfulness: {harmfulness_result.get('reasoning', '')}")
        except Exception as e:
            print(f"Harmfulness evaluation error: {e}")
            criteria_scores["harmfulness"] = 1.0
        
        # Custom criteria evaluation
        for criterion_name, evaluator in self.custom_evaluators.items():
            try:
                result = await evaluator.aevaluate_strings(
                    prediction=prediction,
                    reference=reference,
                    input=question
                )
                criteria_scores[criterion_name] = result["score"]
                all_reasoning.append(f"{criterion_name}: {result.get('reasoning', '')}")
            except Exception as e:
                print(f"{criterion_name} evaluation error: {e}")
                criteria_scores[criterion_name] = 0.5
        
        # Calculate overall score
        valid_scores = [score for score in criteria_scores.values() if score is not None]
        overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.5
        
        evaluation_time = time.time() - start_time
        
        return LangChainEvaluation(
            question=question,
            prediction=prediction,
            reference=reference,
            criteria_scores=criteria_scores,
            reasoning="\n".join(all_reasoning),
            overall_score=overall_score,
            evaluation_time=evaluation_time
        )
    
    def create_advanced_test_cases(self) -> List[Dict[str, Any]]:
        """Create comprehensive test cases with reference answers"""
        
        return [
            {
                "question": "What is your professional background?",
                "reference": "I have X years of experience in software engineering, working at companies like Y and Z, specializing in areas such as full-stack development, cloud architecture, and team leadership.",
                "category": "experience",
                "complexity": "basic",
                "expected_context_keywords": ["experience", "software", "engineering", "companies"]
            },
            {
                "question": "Describe a challenging technical problem you solved and how you approached it.",
                "reference": "I encountered a specific technical challenge involving [problem description], analyzed the root cause through [methodology], implemented a solution using [technologies/approach], and achieved [quantifiable results].",
                "category": "problem_solving", 
                "complexity": "advanced",
                "expected_context_keywords": ["challenge", "problem", "solution", "technical", "approach"]
            },
            {
                "question": "What programming languages and technologies are you most proficient in?",
                "reference": "I am most proficient in [languages] with [years] of experience, and have worked extensively with [technologies/frameworks]. I also have experience with [additional technologies].",
                "category": "technical_skills",
                "complexity": "basic", 
                "expected_context_keywords": ["programming", "languages", "technologies", "proficient"]
            },
            {
                "question": "How do you approach system design for scalable applications?",
                "reference": "My approach to system design involves [methodology], considering factors like [scalability factors], using patterns such as [design patterns], and technologies like [specific technologies] to ensure [performance characteristics].",
                "category": "system_design",
                "complexity": "expert",
                "expected_context_keywords": ["system", "design", "scalable", "architecture", "patterns"]
            }
        ]
    
    async def run_comprehensive_evaluation(self) -> List[LangChainEvaluation]:
        """Run complete LangChain-based evaluation"""
        
        print("🚀 Starting LangChain RAG Evaluation...")
        
        # Get test cases
        test_cases = self.create_advanced_test_cases()
        print(f"📝 Created {len(test_cases)} advanced test cases")
        
        # Run evaluations
        evaluations = []
        
        for i, test_case in enumerate(test_cases):
            print(f"\n🔍 Evaluating {i+1}/{len(test_cases)}: {test_case['category']}")
            print(f"Question: {test_case['question'][:60]}...")
            
            # Query RAG system
            rag_result = await self.query_rag_system(test_case["question"])
            
            if rag_result["success"]:
                # Evaluate response
                evaluation = await self.evaluate_response(
                    question=test_case["question"],
                    prediction=rag_result["answer"],
                    reference=test_case["reference"],
                    context=[source.get("content", "") for source in rag_result["sources"]]
                )
                
                evaluations.append(evaluation)
                print(f"✅ Overall Score: {evaluation.overall_score:.3f}")
            else:
                print(f"❌ RAG system error: {rag_result['answer']}")
        
        print(f"\n🎯 Evaluation Complete! Processed {len(evaluations)} responses")
        return evaluations
    
    def save_results(self, evaluations: List[LangChainEvaluation], filename: str = None):
        """Save evaluation results to JSON"""
        
        if filename is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"langchain_evaluation_{timestamp}.json"
        
        results = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "evaluator": "LangChain",
                "model": "llama-3.1-8b-instant",
                "total_evaluations": len(evaluations)
            },
            "summary": {
                "average_overall_score": sum(e.overall_score for e in evaluations) / len(evaluations) if evaluations else 0,
                "average_evaluation_time": sum(e.evaluation_time for e in evaluations) / len(evaluations) if evaluations else 0,
                "criteria_averages": {}
            },
            "evaluations": [
                {
                    "question": e.question,
                    "prediction": e.prediction,
                    "reference": e.reference,
                    "criteria_scores": e.criteria_scores,
                    "overall_score": e.overall_score,
                    "evaluation_time": e.evaluation_time,
                    "reasoning": e.reasoning
                }
                for e in evaluations
            ]
        }
        
        # Calculate criteria averages
        if evaluations:
            all_criteria = set()
            for e in evaluations:
                all_criteria.update(e.criteria_scores.keys())
            
            for criterion in all_criteria:
                scores = [e.criteria_scores.get(criterion, 0) for e in evaluations]
                results["summary"]["criteria_averages"][criterion] = sum(scores) / len(scores)
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"📊 Results saved to {filename}")
        return filename

# CLI interface
async def main():
    """Main evaluation pipeline"""
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in environment variables")
        return
    
    print("🔬 LangChain RAG Evaluation Framework")
    print("=" * 50)
    
    # Initialize evaluator
    evaluator = LangChainRAGEvaluator(groq_api_key)
    
    # Run evaluation 
    evaluations = await evaluator.run_comprehensive_evaluation()
    
    if evaluations:
        # Save results
        results_file = evaluator.save_results(evaluations)
        
        # Print summary
        avg_score = sum(e.overall_score for e in evaluations) / len(evaluations)
        print(f"\n📈 Average Overall Score: {avg_score:.3f}")
        
        # Print top criteria scores
        all_criteria = set()
        for e in evaluations:
            all_criteria.update(e.criteria_scores.keys())
        
        print("\n📊 Criteria Averages:")
        for criterion in sorted(all_criteria):
            scores = [e.criteria_scores.get(criterion, 0) for e in evaluations]
            avg = sum(scores) / len(scores)
            print(f"  {criterion}: {avg:.3f}")
        
        print(f"\n💾 Detailed results saved to: {results_file}")
        
    else:
        print("❌ No successful evaluations completed")

if __name__ == "__main__":
    asyncio.run(main())