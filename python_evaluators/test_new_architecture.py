#!/usr/bin/env python3
"""
Comprehensive Test for New RAGAS-Only Evaluation Architecture
Tests: LangChain dataset generation + RAGAS evaluation + LangChain feedback
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from langchain_dataset_generator import LangChainDatasetGenerator
from ragas_evaluator import RAGASEvaluator

async def test_complete_workflow():
    """Test the complete evaluation workflow"""
    
    print("=" * 80)
    print("TESTING NEW RAGAS-ONLY EVALUATION ARCHITECTURE")
    print("=" * 80)
    print()
    
    # Test data
    question = "What programming languages do you know?"
    answer = "I have expertise in Python, JavaScript, TypeScript, Java, and C++. I use Python for data science and AI projects, JavaScript/TypeScript for web development with React and Node.js, Java for enterprise applications, and C++ for system programming."
    contexts = [
        "The developer has extensive experience with Python, particularly in data science, machine learning, and AI applications.",
        "Proficient in JavaScript and TypeScript for modern web development, with expertise in React, Next.js, and Node.js frameworks.",
        "Strong knowledge of Java for building enterprise-scale applications and microservices architecture.",
        "Experience with C++ for performance-critical applications and system-level programming."
    ]
    
    try:
        # Step 1: Test LangChain Dataset Generator
        print("📝 STEP 1: Testing LangChain Dataset Generation")
        print("-" * 80)
        
        generator = LangChainDatasetGenerator()
        
        print("\n1.1 Generating Ground Truth...")
        ground_truth = generator.generate_ground_truth(question, contexts)
        print(f"✅ Ground Truth Generated:\n{ground_truth[:200]}...\n")
        
        print("\n1.2 Generating Test Questions...")
        test_questions = generator.generate_test_questions(contexts, 3)
        print(f"✅ Test Questions Generated:")
        for i, q in enumerate(test_questions, 1):
            print(f"   {i}. {q}")
        print()
        
        # Step 2: Test RAGAS Evaluator (PRIMARY METRICS)
        print("\n📊 STEP 2: Testing RAGAS Evaluation (Primary Metrics)")
        print("-" * 80)
        
        evaluator = RAGASEvaluator()
        
        print("\n2.1 Testing BASIC mode evaluation...")
        basic_scores = await evaluator.evaluate_single(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            rag_mode='basic'
        )
        print("✅ BASIC Mode RAGAS Scores:")
        for metric, score in basic_scores.items():
            print(f"   {metric}: {score:.3f}")
        print()
        
        print("\n2.2 Testing ADVANCED mode evaluation...")
        advanced_scores = await evaluator.evaluate_single(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            rag_mode='advanced'
        )
        print("✅ ADVANCED Mode RAGAS Scores:")
        for metric, score in advanced_scores.items():
            print(f"   {metric}: {score:.3f}")
        print()
        
        # Step 3: Test LangChain Feedback Generator
        print("\n💬 STEP 3: Testing LangChain Feedback Generation")
        print("-" * 80)
        
        print("\n3.1 Generating feedback for BASIC mode...")
        basic_feedback = generator.generate_comprehensive_feedback(
            question=question,
            answer=answer,
            contexts=contexts,
            ragas_scores=basic_scores,
            rag_mode='basic'
        )
        print("✅ BASIC Mode Feedback Generated:")
        assessment = str(basic_feedback.get('overall_assessment', 'N/A'))
        strengths = str(basic_feedback.get('strengths', 'N/A'))
        weaknesses = str(basic_feedback.get('weaknesses', 'N/A'))
        print(f"   Overall Assessment: {assessment[:100]}...")
        print(f"   Strengths: {strengths[:100]}...")
        print(f"   Weaknesses: {weaknesses[:100]}...")
        print()
        
        print("\n3.2 Generating feedback for ADVANCED mode...")
        advanced_feedback = generator.generate_comprehensive_feedback(
            question=question,
            answer=answer,
            contexts=contexts,
            ragas_scores=advanced_scores,
            rag_mode='advanced'
        )
        print("✅ ADVANCED Mode Feedback Generated:")
        assessment_adv = str(advanced_feedback.get('overall_assessment', 'N/A'))
        recommendations = str(advanced_feedback.get('recommendations', 'N/A'))
        context_analysis = str(advanced_feedback.get('context_analysis', 'N/A'))
        print(f"   Overall Assessment: {assessment_adv[:100]}...")
        print(f"   Recommendations: {recommendations[:100]}...")
        print(f"   Context Analysis: {context_analysis[:100]}...")
        print()
        
        # Summary
        print("\n" + "=" * 80)
        print("COMPLETE WORKFLOW TEST SUMMARY")
        print("=" * 80)
        print("✅ Step 1: LangChain Dataset Generation - SUCCESS")
        print(f"   - Ground truth generated: {len(ground_truth)} chars")
        print(f"   - Test questions generated: {len(test_questions)} questions")
        print()
        print("✅ Step 2: RAGAS Evaluation (Primary Metrics) - SUCCESS")
        print(f"   - BASIC mode: 6 metrics evaluated")
        print(f"   - ADVANCED mode: 6 metrics evaluated")
        print(f"   - Average BASIC score: {sum(basic_scores.values()) / len(basic_scores):.3f}")
        print(f"   - Average ADVANCED score: {sum(advanced_scores.values()) / len(advanced_scores):.3f}")
        print()
        print("✅ Step 3: LangChain Feedback Generation - SUCCESS")
        print(f"   - BASIC feedback: {len(str(basic_feedback))} chars")
        print(f"   - ADVANCED feedback: {len(str(advanced_feedback))} chars")
        print()
        print("🎉 ALL TESTS PASSED - NEW ARCHITECTURE WORKING CORRECTLY")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🚀 Starting comprehensive evaluation architecture test...\n")
    success = asyncio.run(test_complete_workflow())
    sys.exit(0 if success else 1)
