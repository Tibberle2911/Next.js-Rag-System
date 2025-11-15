#!/usr/bin/env python3
"""
Simple test for RAGAS evaluator
"""
import asyncio
import sys
from ragas_evaluator import RAGASEvaluator

async def test_ragas():
    try:
        evaluator = RAGASEvaluator()
        
        results = await evaluator.evaluate_single(
            question="What are you?",
            answer="I am an AI assistant",
            contexts=["AI assistant information"],
            ground_truth="I am an AI assistant",
            rag_mode="basic"
        )
        
        print("RAGAS Evaluation Results:")
        for metric, score in results.items():
            print(f"  {metric}: {score}")
        
        return True
        
    except Exception as e:
        print(f"Error in RAGAS test: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_ragas())
    sys.exit(0 if success else 1)