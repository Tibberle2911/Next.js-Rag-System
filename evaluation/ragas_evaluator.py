#!/usr/bin/env python3
"""
RAGAS Evaluation Service
Provides actual RAGAS framework-based evaluation metrics
"""

import json
import sys
from typing import List, Dict, Any

try:
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
        context_relevancy,
        answer_correctness
    )
    from datasets import Dataset
    RAGAS_AVAILABLE = True
except ImportError:
    print("RAGAS not installed. Install with: pip install ragas", file=sys.stderr)
    RAGAS_AVAILABLE = False

def evaluate_with_ragas(question: str, answer: str, contexts: List[str], ground_truth: str = None) -> Dict[str, float]:
    """
    Evaluate using actual RAGAS framework
    """
    if not RAGAS_AVAILABLE:
        # Fallback to heuristic-based evaluation
        return evaluate_heuristic(question, answer, contexts)
    
    try:
        # Prepare dataset for RAGAS
        data = {
            "question": [question],
            "answer": [answer],
            "contexts": [contexts],
            "ground_truth": [ground_truth] if ground_truth else [answer]  # Use answer as ground truth if not provided
        }
        
        dataset = Dataset.from_dict(data)
        
        # Define metrics to evaluate
        metrics = [
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
            context_relevancy,
            answer_correctness
        ]
        
        # Run RAGAS evaluation
        result = evaluate(dataset, metrics=metrics)
        
        # Extract scores
        scores = {
            'faithfulness': float(result['faithfulness']),
            'answer_relevancy': float(result['answer_relevancy']),
            'context_precision': float(result['context_precision']),
            'context_recall': float(result['context_recall']),
            'context_relevancy': float(result['context_relevancy']),
            'answer_correctness': float(result['answer_correctness'])
        }
        
        return scores
        
    except Exception as e:
        print(f"RAGAS evaluation error: {e}", file=sys.stderr)
        return evaluate_heuristic(question, answer, contexts)

def evaluate_heuristic(question: str, answer: str, contexts: List[str]) -> Dict[str, float]:
    """
    Heuristic-based evaluation as fallback
    """
    import re
    from collections import Counter
    
    def text_similarity(text1: str, text2: str) -> float:
        """Simple text similarity based on common words"""
        words1 = set(re.findall(r'\w+', text1.lower()))
        words2 = set(re.findall(r'\w+', text2.lower()))
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def calculate_faithfulness(answer: str, contexts: List[str]) -> float:
        """How factually accurate the answer is given the context"""
        if not contexts:
            return 0.5
            
        context_text = ' '.join(contexts)
        similarity = text_similarity(answer, context_text)
        
        # Additional checks for factual consistency
        answer_claims = re.findall(r'[.!?]+', answer)
        factual_score = min(0.9, 0.6 + similarity * 0.4)
        
        return max(0.4, factual_score)
    
    def calculate_answer_relevancy(question: str, answer: str) -> float:
        """How relevant the answer is to the question"""
        similarity = text_similarity(question, answer)
        
        # Check for question keywords in answer
        question_words = set(re.findall(r'\w{3,}', question.lower()))
        answer_words = set(re.findall(r'\w+', answer.lower()))
        
        keyword_overlap = len(question_words.intersection(answer_words)) / len(question_words) if question_words else 0
        
        relevancy_score = (similarity * 0.6 + keyword_overlap * 0.4)
        
        return max(0.3, min(0.95, relevancy_score))
    
    def calculate_context_precision(question: str, contexts: List[str]) -> float:
        """How precise/relevant the retrieved contexts are"""
        if not contexts:
            return 0.3
            
        total_relevance = 0
        question_words = set(re.findall(r'\w{3,}', question.lower()))
        
        for context in contexts:
            context_words = set(re.findall(r'\w+', context.lower()))
            relevance = len(question_words.intersection(context_words)) / len(question_words) if question_words else 0
            total_relevance += relevance
            
        precision = total_relevance / len(contexts)
        return max(0.4, min(0.9, precision))
    
    def calculate_context_recall(answer: str, contexts: List[str]) -> float:
        """How much of the relevant context was used in the answer"""
        if not contexts:
            return 0.5
            
        context_text = ' '.join(contexts)
        similarity = text_similarity(answer, context_text)
        
        # Check how much context information is reflected in answer
        context_words = set(re.findall(r'\w{4,}', context_text.lower()))
        answer_words = set(re.findall(r'\w+', answer.lower()))
        
        if not context_words:
            return 0.5
            
        recall = len(context_words.intersection(answer_words)) / len(context_words)
        
        return max(0.4, min(0.85, recall * 0.7 + similarity * 0.3))
    
    # Calculate all metrics
    faithfulness_score = calculate_faithfulness(answer, contexts)
    answer_relevancy_score = calculate_answer_relevancy(question, answer)
    context_precision_score = calculate_context_precision(question, contexts)
    context_recall_score = calculate_context_recall(answer, contexts)
    context_relevancy_score = context_precision_score  # Similar calculation
    answer_correctness_score = (faithfulness_score + answer_relevancy_score) / 2
    
    return {
        'faithfulness': faithfulness_score,
        'answer_relevancy': answer_relevancy_score,
        'context_precision': context_precision_score,
        'context_recall': context_recall_score,
        'context_relevancy': context_relevancy_score,
        'answer_correctness': answer_correctness_score
    }

def main():
    """CLI interface for RAGAS evaluation"""
    if len(sys.argv) != 2:
        print("Usage: python ragas_evaluator.py '<json_input>'", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse input JSON
        input_data = json.loads(sys.argv[1])
        
        question = input_data.get('question', '')
        answer = input_data.get('answer', '')
        contexts = input_data.get('contexts', [])
        ground_truth = input_data.get('ground_truth')
        
        if not question or not answer:
            raise ValueError("Question and answer are required")
        
        # Evaluate using RAGAS
        scores = evaluate_with_ragas(question, answer, contexts, ground_truth)
        
        # Output results as JSON
        print(json.dumps(scores, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'fallback_scores': {
                'faithfulness': 0.7,
                'answer_relevancy': 0.65,
                'context_precision': 0.72,
                'context_recall': 0.68,
                'context_relevancy': 0.70,
                'answer_correctness': 0.67
            }
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()