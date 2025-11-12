"""
Individual Metric Evaluator for RAG Systems
Evaluates each metric separately for more granular and accurate assessment
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json

# LangChain Core
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq

@dataclass
class IndividualMetricResult:
    """Result of individual metric evaluation"""
    metric_name: str
    score: float
    feedback: str
    evaluation_time: float

@dataclass
class ComprehensiveEvaluationResult:
    """Result of comprehensive evaluation with individual metrics"""
    overall_score: float
    individual_metrics: Dict[str, IndividualMetricResult]
    total_evaluation_time: float
    evaluation_method: str

class IndividualMetricRAGEvaluator:
    """RAG evaluator that assesses each metric individually for higher accuracy"""
    
    def __init__(self, groq_api_key: str):
        """Initialize the evaluator with Groq LLM"""
        self.groq_api_key = groq_api_key
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant",
            temperature=0.1  # Lower temperature for more consistent scoring
        )
        
        # Define evaluation criteria with focused descriptions
        self.criteria = {
            'relevance': {
                'description': 'How well does the answer address the specific question asked?',
                'focus': 'question-answer alignment and topical relevance'
            },
            'coherence': {
                'description': 'Is the answer logically structured and easy to follow?',
                'focus': 'logical flow, clarity, and readability'
            },
            'factual_accuracy': {
                'description': 'Is the information in the answer consistent with the provided context?',
                'focus': 'consistency with source material and factual correctness'
            },
            'completeness': {
                'description': 'Does the answer provide sufficient detail to fully address the question?',
                'focus': 'thoroughness and coverage of the topic'
            },
            'context_usage': {
                'description': 'How effectively does the answer utilize the provided context?',
                'focus': 'integration and utilization of retrieved information'
            },
            'professional_tone': {
                'description': 'Is the answer written in a professional and appropriate tone?',
                'focus': 'language quality, formality, and appropriateness'
            }
        }
        
        # Create individual metric prompts
        self.metric_prompts = self._create_individual_prompts()
    
    def _create_individual_prompts(self) -> Dict[str, PromptTemplate]:
        """Create individual evaluation prompts for each metric"""
        prompts = {}
        
        for metric, details in self.criteria.items():
            template = f"""
You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems.
You are specifically evaluating the {metric.upper()} metric.

EVALUATION FOCUS: {details['description']}
SPECIFIC CRITERIA: {details['focus']}

QUESTION: {{question}}
CONTEXT: {{context}}
GENERATED ANSWER: {{prediction}}
REFERENCE ANSWER: {{reference}}

Please evaluate ONLY the {metric.upper()} aspect of the generated answer.

Scale: 0.0 to 1.0 (where 1.0 is perfect {metric})
- 0.0-0.2: Very poor {metric}
- 0.2-0.4: Poor {metric}
- 0.4-0.6: Average {metric}
- 0.6-0.8: Good {metric}
- 0.8-1.0: Excellent {metric}

Consider only {details['focus']} in your evaluation.

Return ONLY a JSON object:
{{{{
    "{metric}": 0.X,
    "feedback": "Specific explanation focused on {metric} aspect only"
}}}}
"""
            
            prompts[metric] = PromptTemplate(
                input_variables=["question", "context", "prediction", "reference"],
                template=template
            )
        
        return prompts
    
    async def _evaluate_single_metric(
        self, 
        metric_name: str,
        question: str, 
        prediction: str, 
        reference: str, 
        context: List[str]
    ) -> IndividualMetricResult:
        """Evaluate a single metric individually"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Prepare context text
            context_text = " ".join(context) if context else "No context provided"
            
            # Get the specific prompt for this metric
            prompt = self.metric_prompts[metric_name]
            
            # Create the evaluation chain
            chain = prompt | self.llm
            
            # Run evaluation for this specific metric
            response = await chain.ainvoke({
                "question": question,
                "context": context_text,
                "prediction": prediction,
                "reference": reference
            })
            
            # Parse the response
            evaluation_text = response.content.strip()
            
            try:
                # Extract JSON from response
                import re
                
                print(f"Individual {metric_name} response: {evaluation_text[:100]}...")
                
                # Try multiple JSON extraction patterns
                json_patterns = [
                    rf'\{{[^{{}}]*"{metric_name}"[^{{}}]*\}}',  # Look for metric-specific structure
                    r'\{.*?"feedback".*?\}',                   # Alternative pattern
                    r'\{.*?\}',                               # Most general pattern
                ]
                
                evaluation_data = None
                for pattern in json_patterns:
                    json_matches = re.findall(pattern, evaluation_text, re.DOTALL)
                    for match in json_matches:
                        try:
                            test_data = json.loads(match)
                            # Validate that it has our expected structure
                            if metric_name in test_data or 'feedback' in test_data:
                                evaluation_data = test_data
                                print(f"✅ Successfully parsed {metric_name} JSON: {evaluation_data}")
                                break
                        except json.JSONDecodeError:
                            continue
                    if evaluation_data:
                        break
                
                if not evaluation_data:
                    # Fallback: try to extract score using regex
                    score_pattern = rf'"{metric_name}":\s*([0-9.]+)'
                    match = re.search(score_pattern, evaluation_text)
                    if match:
                        score = float(match.group(1))
                        evaluation_data = {metric_name: score, 'feedback': f'{metric_name} evaluation completed'}
                        print(f"✅ Extracted {metric_name} score via regex: {score}")
                
                if evaluation_data:
                    score = float(evaluation_data.get(metric_name, 0.5))
                    # Ensure score is within valid range
                    score = max(0.0, min(1.0, score))
                    feedback = evaluation_data.get('feedback', f'{metric_name} evaluation completed')
                else:
                    raise ValueError(f"No valid {metric_name} evaluation data found")
                
                evaluation_time = asyncio.get_event_loop().time() - start_time
                
                return IndividualMetricResult(
                    metric_name=metric_name,
                    score=score,
                    feedback=feedback,
                    evaluation_time=evaluation_time
                )
                
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                print(f"Error parsing {metric_name} evaluation response: {e}")
                # Return reasonable fallback score for this metric
                return IndividualMetricResult(
                    metric_name=metric_name,
                    score=0.5,
                    feedback=f"{metric_name} evaluation parsing failed: {str(e)}",
                    evaluation_time=asyncio.get_event_loop().time() - start_time
                )
                
        except Exception as e:
            print(f"{metric_name} evaluation error: {e}")
            # Return error result for this metric
            return IndividualMetricResult(
                metric_name=metric_name,
                score=0.0,
                feedback=f"{metric_name} evaluation failed: {str(e)}",
                evaluation_time=asyncio.get_event_loop().time() - start_time
            )
    
    async def evaluate_response(
        self, 
        question: str, 
        prediction: str, 
        reference: str, 
        context: List[str]
    ) -> ComprehensiveEvaluationResult:
        """Evaluate response using individual metric assessments"""
        
        start_time = asyncio.get_event_loop().time()
        
        # Evaluate each metric individually
        individual_results = {}
        
        for metric_name in self.criteria.keys():
            print(f"  📊 Evaluating {metric_name}...")
            
            # Add small delay between evaluations to avoid rate limits
            if individual_results:  # Not the first metric
                await asyncio.sleep(2.0)
            
            metric_result = await self._evaluate_single_metric(
                metric_name, question, prediction, reference, context
            )
            individual_results[metric_name] = metric_result
            
            print(f"    ✅ {metric_name}: {metric_result.score:.3f}")
        
        # Calculate overall score from individual metrics
        valid_scores = [result.score for result in individual_results.values() if result.score > 0.0]
        overall_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0
        
        total_time = asyncio.get_event_loop().time() - start_time
        
        return ComprehensiveEvaluationResult(
            overall_score=overall_score,
            individual_metrics=individual_results,
            total_evaluation_time=total_time,
            evaluation_method='individual_metrics'
        )
    
    def get_criteria_scores(self, evaluation_result: ComprehensiveEvaluationResult) -> Dict[str, float]:
        """Extract criteria scores in compatible format"""
        return {
            metric_name: metric_result.score 
            for metric_name, metric_result in evaluation_result.individual_metrics.items()
        }

# Test function for individual metric evaluation
async def test_individual_evaluation():
    """Test the individual metric evaluator"""
    
    # Load environment
    from dotenv import load_dotenv
    load_dotenv()
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found")
        return
    
    # Initialize evaluator
    evaluator = IndividualMetricRAGEvaluator(groq_api_key)
    
    # Test data
    question = "What programming languages do you know?"
    context = ["I have experience with Python, JavaScript, and Java. I'm proficient in web development."]
    prediction = "I know Python, JavaScript, and Java programming languages with strong web development skills."
    reference = "The candidate should mention their programming language expertise and development experience."
    
    print("🧪 Testing Individual Metric Evaluation...")
    
    # Run evaluation
    result = await evaluator.evaluate_response(question, prediction, reference, context)
    
    print(f"\n📊 Results:")
    print(f"Overall Score: {result.overall_score:.3f}")
    print(f"Evaluation Time: {result.total_evaluation_time:.2f}s")
    print(f"Method: {result.evaluation_method}")
    
    print(f"\n📈 Individual Metrics:")
    for metric_name, metric_result in result.individual_metrics.items():
        print(f"  {metric_name}: {metric_result.score:.3f} ({metric_result.evaluation_time:.2f}s)")
        print(f"    Feedback: {metric_result.feedback[:100]}...")

if __name__ == "__main__":
    asyncio.run(test_individual_evaluation())