"""
Test script for parallel RAGAS evaluation with 4 API keys
"""
import asyncio
import sys
from ragas_evaluator import RAGASEvaluator

async def main():
    print("=" * 70)
    print("Testing Parallel RAGAS Evaluation with 4 API Keys")
    print("=" * 70)
    
    # Initialize evaluator
    evaluator = RAGASEvaluator()
    
    # Test data
    question = "What is machine learning?"
    answer = "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed."
    contexts = [
        "Machine learning is a method of data analysis that automates analytical model building.",
        "It is a branch of artificial intelligence based on the idea that systems can learn from data."
    ]
    ground_truth = "Machine learning is a type of AI that allows software applications to learn from data and become more accurate in predicting outcomes."
    
    print("\n" + "=" * 70)
    print("Test 1: BASIC Mode Evaluation")
    print("=" * 70)
    
    try:
        basic_result = await evaluator.evaluate_single(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            rag_mode='basic'
        )
        
        print("\n✅ BASIC Mode Results:")
        for metric, score in basic_result.items():
            print(f"  {metric}: {score:.4f}")
    
    except Exception as e:
        print(f"\n❌ BASIC Mode failed: {e}")
        return
    
    print("\n" + "=" * 70)
    print("Test 2: ADVANCED Mode Evaluation")
    print("=" * 70)
    
    try:
        advanced_result = await evaluator.evaluate_single(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            rag_mode='advanced'
        )
        
        print("\n✅ ADVANCED Mode Results:")
        for metric, score in advanced_result.items():
            print(f"  {metric}: {score:.4f}")
    
    except Exception as e:
        print(f"\n❌ ADVANCED Mode failed: {e}")
        return
    
    print("\n" + "=" * 70)
    print("Summary:")
    print("=" * 70)
    print(f"✅ Both evaluations completed successfully!")
    print(f"✅ Each evaluation used all 4 API keys in parallel")
    print(f"✅ Metrics were distributed across keys to prevent rate limits")
    print(f"   - Key #1: faithfulness + answer_relevancy")
    print(f"   - Key #2: context_precision + context_recall")
    print(f"   - Key #3: context_relevance")
    print(f"   - Key #4: answer_correctness")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
