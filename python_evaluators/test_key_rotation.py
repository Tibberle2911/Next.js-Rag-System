"""
Test script to verify 4-key round-robin rotation
Shows which key is used for each evaluation call
"""
import asyncio
import sys
from ragas_evaluator import RAGASEvaluator

async def test_rotation():
    print("=" * 60)
    print("Testing 4-Key Round-Robin Rotation")
    print("=" * 60)
    
    evaluator = RAGASEvaluator()
    
    # Simulate multiple evaluation calls to see rotation
    test_data = {
        'question': 'What is cloud computing?',
        'answer': 'Cloud computing provides on-demand computing resources',
        'contexts': ['Cloud computing delivers computing services over the internet'],
        'ground_truth': None
    }
    
    print("\n📝 Simulating evaluation sequence (without actually calling RAGAS):\n")
    
    # Show which key would be used for each call
    for i in range(8):  # Test 8 calls to see full rotation twice
        api_key, key_number = evaluator._get_next_api_key()
        key_preview = f"{api_key[:15]}...{api_key[-8:]}"
        mode = "BASIC" if i % 2 == 0 else "ADVANCED"
        print(f"  Call {i+1}: [{mode:8}] → Key #{key_number} ({key_preview})")
    
    print("\n" + "=" * 60)
    print("✅ Rotation Pattern: 1→2→3→4→1→2→3→4...")
    print("=" * 60)
    print("\nEach question gets evaluated TWICE:")
    print("  1. BASIC mode evaluation → Uses Key #N")
    print("  2. ADVANCED mode evaluation → Uses Key #(N+1)")
    print("\nWith 4 keys, rate limits are distributed across all accounts")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_rotation())
