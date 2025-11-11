#!/usr/bin/env python3
"""
Simple test script to verify advanced RAG integration
Tests both basic and advanced RAG modes via the API
"""

import requests
import json
import time

def test_rag_api():
    """Test both basic and advanced RAG modes"""
    base_url = "http://localhost:3000"
    test_message = "What programming languages do you know?"
    
    print("🧪 Testing RAG API Integration")
    print("=" * 50)
    
    # Test basic mode
    print("\n📝 Testing Basic RAG Mode...")
    try:
        start_time = time.time()
        response = requests.post(
            f"{base_url}/api/chat",
            json={
                "message": test_message,
                "mode": "basic"
            },
            timeout=30
        )
        basic_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Basic RAG Success ({basic_time:.2f}s)")
            print(f"📄 Answer: {data['message'][:100]}...")
            print(f"📚 Sources: {len(data.get('sources', []))} documents")
            print(f"🔧 Mode: {data.get('metadata', {}).get('mode', 'unknown')}")
        else:
            print(f"❌ Basic RAG Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Basic RAG Error: {e}")
    
    # Test advanced mode
    print("\n🚀 Testing Advanced RAG Mode...")
    try:
        start_time = time.time()
        response = requests.post(
            f"{base_url}/api/chat",
            json={
                "message": test_message,
                "mode": "advanced",
                "advancedConfig": {
                    "useMultiQuery": True,
                    "useRagFusion": True,
                    "useDecomposition": False,
                    "useStepBack": False,
                    "useHyde": False
                }
            },
            timeout=45
        )
        advanced_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            metadata = data.get('metadata', {})
            techniques_used = metadata.get('techniquesUsed', [])
            
            print(f"✅ Advanced RAG Success ({advanced_time:.2f}s)")
            print(f"📄 Answer: {data['message'][:100]}...")
            print(f"📚 Sources: {len(data.get('sources', []))} documents")
            print(f"🔧 Mode: {metadata.get('mode', 'unknown')}")
            print(f"🧠 Techniques Used: {', '.join(techniques_used) if techniques_used else 'None'}")
            print(f"⚡ Processing Time: {metadata.get('processingTime', 0):.2f}ms")
            
            # Performance comparison
            if basic_time and advanced_time:
                improvement = ((advanced_time - basic_time) / basic_time) * 100
                print(f"\n📊 Performance Comparison:")
                print(f"   Basic: {basic_time:.2f}s")
                print(f"   Advanced: {advanced_time:.2f}s")
                print(f"   Difference: {improvement:+.1f}% processing time")
        else:
            print(f"❌ Advanced RAG Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Advanced RAG Error: {e}")
    
    # Test API status
    print("\n🔍 Testing API Status...")
    try:
        response = requests.get(f"{base_url}/api/chat")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Status: {data.get('status', 'unknown')}")
            print(f"🎯 Supported Modes: {', '.join(data.get('supportedModes', []))}")
            print(f"🧠 Advanced Techniques: {len(data.get('advancedTechniques', []))} available")
        else:
            print(f"❌ API Status Check Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API Status Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Integration test completed!")

if __name__ == "__main__":
    test_rag_api()