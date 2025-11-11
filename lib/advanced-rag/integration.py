"""
Integration with Existing RAG System
Connects advanced query transformation techniques to your current RAG implementation
"""

import os
import sys
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path

# Add the main RAG system to path
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

# Import existing RAG components
try:
    from lib.rag_client import queryRAG, queryVectorDatabase
    from lib.groq_client import generateResponse
except ImportError:
    print("Warning: Could not import existing RAG components. Running in standalone mode.")

from advanced_rag_transformer import AdvancedRAGQueryTransformer, QueryTransformationConfig
from hybrid_search import HybridSearchEngine, HybridSearchConfig
from evaluation_framework import RAGEvaluationFramework, TestCase


class IntegratedAdvancedRAG:
    """Integration layer between advanced RAG techniques and existing system"""
    
    def __init__(self, groq_api_key: str, openai_api_key: str = None):
        self.groq_api_key = groq_api_key
        self.openai_api_key = openai_api_key
        
        # Initialize advanced transformer
        self.transformer_config = QueryTransformationConfig(
            use_multi_query=True,
            use_rag_fusion=True,
            use_decomposition=True,
            use_step_back=True,
            use_hyde=True,
            num_multi_queries=4,
            fusion_queries=3
        )
        
        self.advanced_transformer = AdvancedRAGQueryTransformer(
            groq_api_key=groq_api_key,
            openai_api_key=openai_api_key,
            config=self.transformer_config
        )
        
        # Initialize hybrid search
        self.hybrid_config = HybridSearchConfig(
            vector_top_k=8,
            bm25_top_k=8,
            vector_weight=0.4,
            bm25_weight=0.4,
            tfidf_weight=0.2,
            use_semantic_reranking=True,
            rerank_top_k=5
        )
        
        self.hybrid_search = HybridSearchEngine(self.hybrid_config)
        
        # Evaluation framework
        self.evaluator = RAGEvaluationFramework(use_semantic_similarity=True)
        
        # Integration state
        self.is_initialized = False
        self.documents_loaded = False
    
    async def initialize_with_existing_data(self):
        """Initialize with data from existing RAG system"""
        print("🔄 Initializing with existing RAG system data...")
        
        try:
            # Try to load professional profile data
            profile_docs = await self._load_professional_profile()
            
            if profile_docs:
                # Load into advanced transformer
                self.advanced_transformer.load_documents(documents=profile_docs)
                
                # Load into hybrid search
                self.hybrid_search.build_indexes(profile_docs)
                
                self.documents_loaded = True
                print(f"✅ Loaded {len(profile_docs)} professional profile documents")
            else:
                print("⚠️ No existing data found, using sample documents")
                await self._load_sample_documents()
            
            self.is_initialized = True
            
        except Exception as e:
            print(f"❌ Error initializing with existing data: {e}")
            print("🔄 Falling back to sample documents...")
            await self._load_sample_documents()
    
    async def _load_professional_profile(self) -> List[str]:
        """Load professional profile data from existing system"""
        try:
            # Try to use existing vector database query
            if 'queryVectorDatabase' in globals():
                # Query for different types of professional information
                profile_queries = [
                    "professional background experience",
                    "technical skills programming",
                    "project work achievements",
                    "education qualifications",
                    "career goals objectives"
                ]
                
                profile_docs = []
                for query in profile_queries:
                    results = await queryVectorDatabase(query, topK=5)
                    for result in results:
                        if hasattr(result, 'content'):
                            profile_docs.append(result.content)
                        elif isinstance(result, dict) and 'content' in result:
                            profile_docs.append(result['content'])
                
                return list(set(profile_docs))  # Remove duplicates
            
        except Exception as e:
            print(f"Could not load existing profile data: {e}")
        
        return []
    
    async def _load_sample_documents(self):
        """Load sample documents for demonstration"""
        sample_docs = [
            "I am Tylor, a software developer specializing in TypeScript, React, and AI integration.",
            "My experience includes working with modern web technologies and building scalable applications.",
            "I have expertise in prompt engineering and AI tool integration using OpenAI and Gemini APIs.",
            "My technical skills include advanced TypeScript patterns, design systems, and performance optimization.",
            "I worked as a Casual Gaming Attendant at ALH Group, improving customer service processes.",
            "At ALH Group, I achieved a 20% increase in sales registrations and 35% improvement in loyalty retention.",
            "My educational background includes studying Computer Science at Swinburne University.",
            "I have experience with data visualization pipelines and deployment automation.",
            "My career goals include becoming a senior developer and leading innovative AI projects.",
            "I excel at adapting to new technologies and learning cutting-edge development practices."
        ]
        
        # Load into advanced transformer
        self.advanced_transformer.load_documents(documents=sample_docs)
        
        # Load into hybrid search
        self.hybrid_search.build_indexes(sample_docs)
        
        self.documents_loaded = True
        self.is_initialized = True
        print(f"✅ Loaded {len(sample_docs)} sample documents")
    
    async def enhanced_query(self, question: str, mode: str = "comprehensive") -> Dict[str, Any]:
        """Enhanced query processing with advanced techniques"""
        if not self.is_initialized:
            await self.initialize_with_existing_data()
        
        print(f"🚀 Processing enhanced query: '{question}'")
        print(f"📊 Mode: {mode}")
        
        if mode == "comprehensive":
            # Use full advanced RAG pipeline
            result = await self.advanced_transformer.advanced_rag_query(question)
            
            # Add hybrid search results
            hybrid_results = self.hybrid_search.search(question, top_k=5)
            result["hybrid_search_results"] = hybrid_results
            
            return result
        
        elif mode == "hybrid_only":
            # Use only hybrid search
            search_results = self.hybrid_search.search(question, top_k=5)
            
            # Generate answer using search results
            context = "\n".join([r["document"] for r in search_results[:3]])
            answer = await self._generate_answer(question, context)
            
            return {
                "question": question,
                "final_answer": answer,
                "search_results": search_results,
                "mode": mode
            }
        
        elif mode == "comparison":
            # Compare with existing RAG system
            results = {}
            
            # Advanced RAG result
            results["advanced"] = await self.advanced_transformer.advanced_rag_query(question)
            
            # Existing system result (if available)
            try:
                if 'queryRAG' in globals():
                    existing_result = await queryRAG(question)
                    results["existing"] = {
                        "question": question,
                        "final_answer": existing_result,
                        "mode": "existing_system"
                    }
            except:
                results["existing"] = {"error": "Existing system not available"}
            
            # Hybrid search result
            hybrid_results = self.hybrid_search.search(question, top_k=5)
            context = "\n".join([r["document"] for r in hybrid_results[:3]])
            hybrid_answer = await self._generate_answer(question, context)
            
            results["hybrid"] = {
                "question": question,
                "final_answer": hybrid_answer,
                "search_results": hybrid_results,
                "mode": "hybrid_search"
            }
            
            return results
        
        else:
            raise ValueError(f"Unknown mode: {mode}")
    
    async def _generate_answer(self, question: str, context: str) -> str:
        """Generate answer using GROQ with provided context"""
        try:
            if 'generateResponse' in globals():
                # Use existing generateResponse function
                return await generateResponse({
                    "question": question,
                    "context": context
                })
            else:
                # Use direct LLM call
                prompt = f"""Based on the following context, provide a comprehensive answer to the question.

Context:
{context}

Question: {question}

Answer:"""
                
                response = self.advanced_transformer.llm.invoke(prompt)
                return response.content
                
        except Exception as e:
            return f"Error generating answer: {str(e)}"
    
    async def run_evaluation_on_integration(self) -> Dict[str, Any]:
        """Run evaluation comparing different approaches"""
        if not self.is_initialized:
            await self.initialize_with_existing_data()
        
        print("🔬 Running comprehensive evaluation...")
        
        # Create test cases based on professional profile
        test_cases = [
            TestCase(
                question="Tell me about your professional background",
                ground_truth_answer="I am a software developer with experience in TypeScript, React, and AI integration, with a background in customer service at ALH Group.",
                relevant_documents=["professional background", "software developer", "TypeScript experience"],
                difficulty="easy",
                category="personal"
            ),
            TestCase(
                question="What are your technical skills and expertise?",
                ground_truth_answer="My technical skills include TypeScript, React, AI integration, prompt engineering, design systems, and data visualization pipelines.",
                relevant_documents=["technical skills", "TypeScript", "AI integration", "prompt engineering"],
                difficulty="medium",
                category="skills"
            ),
            TestCase(
                question="How did you improve performance at ALH Group and what were the results?",
                ground_truth_answer="At ALH Group, I improved customer service processes, achieving a 20% increase in sales registrations and 35% improvement in loyalty retention.",
                relevant_documents=["ALH Group", "performance improvement", "sales increase", "loyalty retention"],
                difficulty="hard",
                category="achievements"
            ),
        ]
        
        # Evaluate different techniques
        techniques = ["comprehensive", "hybrid_only"]
        
        evaluation_results = {}
        
        for technique in techniques:
            technique_results = []
            
            for test_case in test_cases:
                try:
                    # Get response using the technique
                    result = await self.enhanced_query(test_case.question, mode=technique)
                    
                    if isinstance(result, dict) and "final_answer" in result:
                        generated_answer = result["final_answer"]
                    else:
                        generated_answer = str(result)
                    
                    # Evaluate the response
                    metrics = await self.evaluator.evaluate_single_query(
                        self.advanced_transformer, test_case, technique
                    )
                    
                    technique_results.append({
                        "test_case": test_case,
                        "generated_answer": generated_answer,
                        "metrics": metrics
                    })
                    
                except Exception as e:
                    print(f"Error evaluating {technique} on '{test_case.question}': {e}")
                    technique_results.append({
                        "test_case": test_case,
                        "error": str(e)
                    })
            
            evaluation_results[technique] = technique_results
        
        # Calculate summary statistics
        summary = self._calculate_evaluation_summary(evaluation_results)
        
        return {
            "detailed_results": evaluation_results,
            "summary": summary,
            "test_cases": test_cases
        }
    
    def _calculate_evaluation_summary(self, results: Dict[str, List]) -> Dict[str, Any]:
        """Calculate summary statistics from evaluation results"""
        summary = {}
        
        for technique, technique_results in results.items():
            valid_results = [r for r in technique_results if "error" not in r]
            
            if not valid_results:
                summary[technique] = {"error": "No valid results"}
                continue
            
            # Extract metrics
            metrics_list = [r["metrics"] for r in valid_results]
            
            # Calculate averages
            avg_metrics = {}
            for metric_name in ["semantic_similarity", "answer_relevance", "response_time", "bleu_score"]:
                values = [getattr(m, metric_name, 0) for m in metrics_list]
                avg_metrics[metric_name] = {
                    "mean": sum(values) / len(values) if values else 0,
                    "min": min(values) if values else 0,
                    "max": max(values) if values else 0
                }
            
            summary[technique] = {
                "num_tests": len(technique_results),
                "num_successful": len(valid_results),
                "success_rate": len(valid_results) / len(technique_results) if technique_results else 0,
                "avg_metrics": avg_metrics
            }
        
        return summary


# Interactive demonstration
async def interactive_demo():
    """Interactive demonstration of the integrated advanced RAG system"""
    print("🚀 Advanced RAG Integration Demo")
    print("=" * 50)
    
    # Get API key
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ Please set GROQ_API_KEY environment variable")
        return
    
    # Initialize integrated system
    integrated_rag = IntegratedAdvancedRAG(groq_api_key=groq_api_key)
    
    # Sample questions for demonstration
    demo_questions = [
        "What is your professional background?",
        "Tell me about your technical skills",
        "How did you improve performance at ALH Group?",
        "What are your career goals?",
        "What experience do you have with AI integration?"
    ]
    
    print("\n🔄 Initializing system...")
    await integrated_rag.initialize_with_existing_data()
    
    print("\n📋 Available demo questions:")
    for i, question in enumerate(demo_questions, 1):
        print(f"{i}. {question}")
    
    # Demonstrate different modes
    modes = ["comprehensive", "hybrid_only", "comparison"]
    
    for mode in modes:
        print(f"\n{'='*60}")
        print(f"🧪 DEMONSTRATING MODE: {mode.upper()}")
        print(f"{'='*60}")
        
        # Use first question for demo
        demo_question = demo_questions[0]
        print(f"\nQuestion: {demo_question}")
        
        try:
            result = await integrated_rag.enhanced_query(demo_question, mode=mode)
            
            if mode == "comparison":
                print("\n📊 COMPARISON RESULTS:")
                for approach, approach_result in result.items():
                    print(f"\n--- {approach.upper()} APPROACH ---")
                    if "error" in approach_result:
                        print(f"❌ Error: {approach_result['error']}")
                    else:
                        answer = approach_result.get("final_answer", "No answer generated")
                        print(f"Answer: {answer[:300]}..." if len(answer) > 300 else f"Answer: {answer}")
            else:
                answer = result.get("final_answer", "No answer generated")
                print(f"\nAnswer: {answer}")
                
                if "techniques_used" in result:
                    print(f"Techniques used: {', '.join(result['techniques_used'])}")
                
                if "search_results" in result:
                    print(f"Sources found: {len(result['search_results'])}")
        
        except Exception as e:
            print(f"❌ Error in {mode} mode: {e}")
    
    # Run evaluation
    print(f"\n{'='*60}")
    print("🔬 RUNNING COMPREHENSIVE EVALUATION")
    print(f"{'='*60}")
    
    try:
        eval_results = await integrated_rag.run_evaluation_on_integration()
        
        print("\n📊 EVALUATION SUMMARY:")
        for technique, summary in eval_results["summary"].items():
            if "error" in summary:
                print(f"\n❌ {technique}: {summary['error']}")
            else:
                print(f"\n✅ {technique.upper()}:")
                print(f"   Success Rate: {summary['success_rate']:.1%}")
                print(f"   Avg Semantic Similarity: {summary['avg_metrics']['semantic_similarity']['mean']:.3f}")
                print(f"   Avg Response Time: {summary['avg_metrics']['response_time']['mean']:.2f}s")
                print(f"   Avg Answer Relevance: {summary['avg_metrics']['answer_relevance']['mean']:.3f}")
    
    except Exception as e:
        print(f"❌ Evaluation error: {e}")
    
    print("\n✅ Demo completed!")
    print("\n💡 Key Features Demonstrated:")
    print("   - Advanced query transformation (Multi-Query, RAG-Fusion, HyDE, etc.)")
    print("   - Hybrid search (Vector + BM25 + TF-IDF + Semantic reranking)")
    print("   - Integration with existing RAG system")
    print("   - Comprehensive evaluation framework")
    print("   - Performance comparison between techniques")


# CLI interface
async def main():
    """Main CLI interface for the integrated advanced RAG system"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Advanced RAG Integration System")
    parser.add_argument("--demo", action="store_true", help="Run interactive demonstration")
    parser.add_argument("--evaluate", action="store_true", help="Run evaluation only")
    parser.add_argument("--query", type=str, help="Process a single query")
    parser.add_argument("--mode", type=str, default="comprehensive", 
                       choices=["comprehensive", "hybrid_only", "comparison"],
                       help="Query processing mode")
    
    args = parser.parse_args()
    
    # Check for API key
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ Please set GROQ_API_KEY environment variable")
        return
    
    # Initialize system
    integrated_rag = IntegratedAdvancedRAG(groq_api_key=groq_api_key)
    await integrated_rag.initialize_with_existing_data()
    
    if args.demo:
        await interactive_demo()
    elif args.evaluate:
        print("🔬 Running evaluation...")
        results = await integrated_rag.run_evaluation_on_integration()
        print("✅ Evaluation completed!")
        
        # Print summary
        for technique, summary in results["summary"].items():
            print(f"\n{technique.upper()}:")
            if "error" not in summary:
                print(f"  Success Rate: {summary['success_rate']:.1%}")
                print(f"  Avg Semantic Similarity: {summary['avg_metrics']['semantic_similarity']['mean']:.3f}")
    elif args.query:
        print(f"🔍 Processing query: {args.query}")
        result = await integrated_rag.enhanced_query(args.query, mode=args.mode)
        
        if args.mode == "comparison":
            for approach, approach_result in result.items():
                print(f"\n{approach.upper()}: {approach_result.get('final_answer', 'Error')}")
        else:
            print(f"\nAnswer: {result.get('final_answer', 'Error')}")
    else:
        print("Use --demo, --evaluate, or --query with your question")
        print("Example: python integration.py --query 'What are your technical skills?'")


if __name__ == "__main__":
    asyncio.run(main())