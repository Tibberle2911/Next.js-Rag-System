"""
Quick test script to verify the GROQ evaluator bug fix
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our evaluator
from rag_evaluator import RAGEvaluator

async def test_evaluator():
    """Test the GROQ evaluator with the result initialization fix"""
    
    # Initialize evaluator
    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in environment")
        return
    
    evaluator = RAGEvaluator(groq_api_key)
    
    # Test data
    questions = ["What is your experience?"]
    answers = ["I have 5 years of experience in software development."]
    contexts = [["I worked as a software developer for 5 years."]]
    ground_truths = ["Experience in software development"]
    
    try:
        print("🔬 Testing GROQ-based evaluation...")
        results = await evaluator._groq_based_evaluation(questions, answers, contexts, ground_truths)
        print(f"✅ Evaluation completed successfully!")
        print(f"📊 Results: {results}")
        return True
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_evaluator())
    print(f"🎯 Test {'PASSED' if success else 'FAILED'}")