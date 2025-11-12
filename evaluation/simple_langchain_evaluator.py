"""
Simplified LangChain RAG Evaluator
Compatible with current LangChain versions
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
class EvaluationResult:
    """Result of LangChain RAG evaluation"""
    overall_score: float
    criteria_scores: Dict[str, float]
    feedback: str
    evaluation_time: float

class SimpleLangChainRAGEvaluator:
    """Simplified LangChain-based RAG evaluator using direct LLM calls"""
    
    def __init__(self, groq_api_key: str):
        """Initialize the evaluator with Groq LLM"""
        self.groq_api_key = groq_api_key
        self.llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant",
            temperature=0.2
        )
        
        # Define evaluation criteria
        self.criteria = {
            'relevance': 'How well does the answer address the specific question asked?',
            'coherence': 'Is the answer logically structured and easy to follow?',
            'factual_accuracy': 'Is the information in the answer consistent with the provided context?',
            'completeness': 'Does the answer provide sufficient detail to fully address the question?',
            'context_usage': 'How effectively does the answer utilize the provided context?',
            'professional_tone': 'Is the answer written in a professional and appropriate tone?'
        }
        
        # Create evaluation prompt
        self.evaluation_prompt = PromptTemplate(
            input_variables=["question", "context", "prediction", "reference"],
            template="""
You are an expert evaluator for RAG (Retrieval-Augmented Generation) systems.

Evaluate the following response based on multiple criteria:

QUESTION: {question}
CONTEXT: {context}
GENERATED ANSWER: {prediction}
REFERENCE ANSWER: {reference}

Please evaluate the generated answer on the following criteria (scale 0.0 to 1.0):

1. RELEVANCE: How well does the answer address the specific question asked?
2. COHERENCE: Is the answer logically structured and easy to follow?
3. FACTUAL_ACCURACY: Is the information consistent with the provided context?
4. COMPLETENESS: Does the answer provide sufficient detail?
5. CONTEXT_USAGE: How effectively does the answer use the provided context?
6. PROFESSIONAL_TONE: Is the answer written professionally?

Return ONLY a JSON object with scores and overall assessment:
{{
    "relevance": 0.X,
    "coherence": 0.X,
    "factual_accuracy": 0.X,
    "completeness": 0.X,
    "context_usage": 0.X,
    "professional_tone": 0.X,
    "overall_score": 0.X,
    "feedback": "Brief explanation of the evaluation"
}}
"""
        )
    
    async def evaluate_response(
        self, 
        question: str, 
        prediction: str, 
        reference: str, 
        context: List[str]
    ) -> EvaluationResult:
        """Evaluate a single response using LangChain and Groq"""
        
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Prepare context text
            context_text = " ".join(context) if context else "No context provided"
            
            # Create the evaluation chain (modern approach)
            chain = self.evaluation_prompt | self.llm
            
            # Run evaluation
            response = await chain.ainvoke({
                "question": question,
                "context": context_text,
                "prediction": prediction,
                "reference": reference
            })
            
            # Parse the response
            evaluation_text = response.content.strip()
            
            try:
                # Extract JSON from response - try multiple patterns
                import re
                
                # Clean the response text
                evaluation_text = response.content.strip()
                print(f"LangChain response: {evaluation_text[:200]}...")  # Debug output
                
                # Try multiple JSON extraction patterns
                json_patterns = [
                    r'\{[^{}]*"relevance"[^{}]*\}',  # Look for our specific structure
                    r'\{.*?"overall_score".*?\}',     # Alternative pattern
                    r'\{.*?\}',                       # Most general pattern
                ]
                
                evaluation_data = None
                for pattern in json_patterns:
                    json_matches = re.findall(pattern, evaluation_text, re.DOTALL)
                    for match in json_matches:
                        try:
                            test_data = json.loads(match)
                            # Validate that it has our expected structure
                            if any(key in test_data for key in ['relevance', 'coherence', 'overall_score']):
                                evaluation_data = test_data
                                print(f"✅ Successfully parsed JSON: {evaluation_data}")
                                break
                        except json.JSONDecodeError:
                            continue
                    if evaluation_data:
                        break
                
                if not evaluation_data:
                    print(f"⚠️ Could not find valid JSON in response, using pattern matching...")
                    # Fallback: try to extract scores using regex
                    scores = {}
                    score_patterns = {
                        'relevance': r'"relevance":\s*([0-9.]+)',
                        'coherence': r'"coherence":\s*([0-9.]+)', 
                        'factual_accuracy': r'"factual_accuracy":\s*([0-9.]+)',
                        'completeness': r'"completeness":\s*([0-9.]+)',
                        'context_usage': r'"context_usage":\s*([0-9.]+)',
                        'professional_tone': r'"professional_tone":\s*([0-9.]+)',
                        'overall_score': r'"overall_score":\s*([0-9.]+)'
                    }
                    
                    for key, pattern in score_patterns.items():
                        match = re.search(pattern, evaluation_text)
                        if match:
                            scores[key] = float(match.group(1))
                    
                    if scores:
                        evaluation_data = scores
                        print(f"✅ Extracted scores via regex: {evaluation_data}")
                
                if evaluation_data:
                    # Extract scores
                    criteria_scores = {
                        criterion: float(evaluation_data.get(criterion, 0.5))
                        for criterion in self.criteria.keys()
                    }
                    
                    overall_score = float(evaluation_data.get('overall_score', 
                        sum(criteria_scores.values()) / len(criteria_scores)))
                    
                    feedback = evaluation_data.get('feedback', 'LangChain evaluation completed successfully')
                    
                else:
                    raise ValueError("No valid evaluation data found in response")
                
                evaluation_time = asyncio.get_event_loop().time() - start_time
                
                return EvaluationResult(
                    overall_score=overall_score,
                    criteria_scores=criteria_scores,
                    feedback=feedback,
                    evaluation_time=evaluation_time
                )
                
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                print(f"Error parsing LangChain evaluation response: {e}")
                # Fallback to default scores
                default_scores = {criterion: 0.5 for criterion in self.criteria.keys()}
                return EvaluationResult(
                    overall_score=0.5,
                    criteria_scores=default_scores,
                    feedback=f"Evaluation parsing failed: {str(e)}",
                    evaluation_time=asyncio.get_event_loop().time() - start_time
                )
                
        except Exception as e:
            print(f"LangChain evaluation error: {e}")
            # Return error result
            error_scores = {criterion: 0.0 for criterion in self.criteria.keys()}
            return EvaluationResult(
                overall_score=0.0,
                criteria_scores=error_scores,
                feedback=f"LangChain evaluation failed: {str(e)}",
                evaluation_time=asyncio.get_event_loop().time() - start_time
            )

# Alias for compatibility with existing code
LangChainRAGEvaluator = SimpleLangChainRAGEvaluator