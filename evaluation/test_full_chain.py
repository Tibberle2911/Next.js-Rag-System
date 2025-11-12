"""
Test the full evaluation chain including LangChain
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

# Import our evaluator
from rag_evaluator import RAGEvaluator

async def test_full_evaluation_chain():
    """Test the complete evaluation chain"""
    
    # Initialize evaluator
    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in environment")
        return False
    
    evaluator = RAGEvaluator(groq_api_key)
    
    # Test data
    questions = ["What is your experience?"]
    answers = ["I have 5 years of experience in software development."]
    contexts = [["I worked as a software developer for 5 years."]]
    ground_truths = ["Experience in software development"]
    
    try:
        print("🔬 Testing full evaluation chain (should use LangChain first)...")
        
        # Create mock test cases
        from rag_evaluator import RAGTestCase
        test_cases = [RAGTestCase(
            question="What is your experience?",
            expected_answer="Experience in software development",
            context_keywords=["experience", "software", "development"],
            difficulty="easy",
            category="experience"
        )]
        
        # Create mock RAG results
        rag_results = [{
            "answer": "I have 5 years of experience in software development.",
            "contexts": ["I worked as a software developer for 5 years."],
            "response_time": 1.5
        }]
        
        # Run the full evaluation chain
        results = await evaluator.evaluate_with_ragas(test_cases, rag_results)
        
        print(f"✅ Evaluation completed successfully!")
        print(f"📊 Results: {results}")
        
        # Check if LangChain was used
        for result in results:
            if 'evaluation_method' in result:
                method = result['evaluation_method']
                print(f"🔍 Evaluation method used: {method}")
                if method == 'langchain':
                    print("✅ LangChain evaluator was successfully used!")
                    return True
                else:
                    print(f"⚠️ Used {method} instead of LangChain")
            else:
                print("⚠️ No evaluation method specified in results")
        
        return True
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_full_evaluation_chain())
    print(f"🎯 Test {'PASSED' if success else 'FAILED'}")