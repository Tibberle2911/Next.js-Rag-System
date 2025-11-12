"""
Test script to check if LangChain evaluator can be imported and used
"""
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

def test_langchain_import():
    """Test if LangChain evaluator can be imported"""
    try:
        from simple_langchain_evaluator import SimpleLangChainRAGEvaluator as LangChainRAGEvaluator
        print("✅ LangChain evaluator import successful")
        return True
    except ImportError as e:
        print(f"❌ LangChain evaluator import failed: {e}")
        return False
    except Exception as e:
        print(f"⚠️ Unexpected error importing LangChain evaluator: {e}")
        return False

async def test_langchain_evaluator():
    """Test if LangChain evaluator can be initialized and used"""
    try:
        from simple_langchain_evaluator import SimpleLangChainRAGEvaluator as LangChainRAGEvaluator
        
        groq_api_key = os.getenv('GROQ_API_KEY')
        if not groq_api_key:
            print("❌ GROQ_API_KEY not found")
            return False
        
        # Initialize evaluator
        evaluator = LangChainRAGEvaluator(groq_api_key)
        print("✅ LangChain evaluator initialization successful")
        
        # Test evaluation
        result = await evaluator.evaluate_response(
            question="What is your experience?",
            prediction="I have 5 years of software development experience.",
            reference="Experience in software development",
            context=["I worked as a software developer for 5 years."]
        )
        
        print(f"✅ LangChain evaluation successful: {result.overall_score}")
        return True
        
    except ImportError as e:
        print(f"❌ LangChain evaluator not available: {e}")
        return False
    except Exception as e:
        print(f"❌ LangChain evaluation failed: {e}")
        return False

if __name__ == "__main__":
    print("🔬 Testing LangChain evaluator...")
    
    # Test import
    if test_langchain_import():
        # Test usage
        success = asyncio.run(test_langchain_evaluator())
        print(f"🎯 LangChain evaluator test {'PASSED' if success else 'FAILED'}")
    else:
        print("🎯 LangChain evaluator test FAILED - import error")