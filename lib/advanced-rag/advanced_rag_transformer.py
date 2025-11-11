"""
Advanced RAG Query Transformation System
Based on research from "Mastering RAG: From Fundamentals to Advanced Query Transformation Techniques"

Implements 5 advanced query transformation techniques:
1. Multi-Query Generation
2. RAG-Fusion with Reciprocal Rank Fusion (RRF)
3. Query Decomposition
4. Step-Back Prompting
5. HyDE (Hypothetical Document Embeddings)
"""

import os
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import numpy as np
from operator import itemgetter

# LangChain imports
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.prompts import ChatPromptTemplate, FewShotChatMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain.load import dumps, loads

# Additional imports for hybrid search
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import faiss
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class QueryTransformationConfig:
    """Configuration for query transformation techniques"""
    use_multi_query: bool = True
    use_rag_fusion: bool = True
    use_decomposition: bool = True
    use_step_back: bool = True
    use_hyde: bool = True
    
    # Multi-query settings
    num_multi_queries: int = 5
    
    # RAG-Fusion settings
    rrr_k_value: int = 60
    fusion_queries: int = 4
    
    # Decomposition settings
    max_sub_questions: int = 3
    
    # Step-back settings
    use_few_shot_examples: bool = True
    
    # HyDE settings
    hyde_model_temperature: float = 0.2


class AdvancedRAGQueryTransformer:
    """Advanced RAG system with sophisticated query transformation techniques"""
    
    def __init__(self, groq_api_key: str, openai_api_key: str = None, config: QueryTransformationConfig = None):
        """Initialize the advanced RAG transformer"""
        self.groq_api_key = groq_api_key
        self.openai_api_key = openai_api_key
        self.config = config or QueryTransformationConfig()
        
        # Initialize LLM (prefer GROQ for speed, OpenAI for quality)
        if groq_api_key:
            from groq import Groq
            self.groq_client = Groq(api_key=groq_api_key)
            self.llm = ChatOpenAI(
                model="llama-3.1-8b-instant",
                temperature=0.1,
                api_key=groq_api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        else:
            self.llm = ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0.1,
                api_key=openai_api_key
            )
        
        # Initialize embedding model
        self.embeddings = OpenAIEmbeddings(api_key=openai_api_key) if openai_api_key else None
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')  # Fallback embedding model
        
        # Vector store and retriever (to be initialized)
        self.vectorstore = None
        self.retriever = None
        
        # BM25 for hybrid search
        self.bm25 = None
        self.documents = []
        
        # Setup transformation chains
        self._setup_transformation_chains()
    
    def _setup_transformation_chains(self):
        """Initialize all query transformation chains"""
        
        # 1. Multi-Query Chain
        if self.config.use_multi_query:
            self.multi_query_chain = self._build_multi_query_chain()
        
        # 2. RAG-Fusion Chain
        if self.config.use_rag_fusion:
            self.rag_fusion_chain = self._build_rag_fusion_chain()
        
        # 3. Decomposition Chain
        if self.config.use_decomposition:
            self.decomposition_chain = self._build_decomposition_chain()
        
        # 4. Step-Back Chain
        if self.config.use_step_back:
            self.step_back_chain = self._build_step_back_chain()
        
        # 5. HyDE Chain
        if self.config.use_hyde:
            self.hyde_chain = self._build_hyde_chain()
    
    def _build_multi_query_chain(self):
        """Build Multi-Query transformation chain"""
        template = f"""You are an AI language model assistant. Your task is to generate
{self.config.num_multi_queries} different versions of the given user question to retrieve relevant documents
from a vector database. By generating multiple perspectives on the user question, your goal is to help
the user overcome some of the limitations of the distance-based similarity search.
Provide these alternative questions separated by newlines.

Original question: {{question}}"""

        prompt = ChatPromptTemplate.from_template(template)
        generate_queries = (
            prompt 
            | self.llm
            | StrOutputParser()
            | (lambda x: x.split("\n"))
        )
        
        return generate_queries
    
    def _build_rag_fusion_chain(self):
        """Build RAG-Fusion chain with Reciprocal Rank Fusion"""
        template = f"""You are a helpful assistant that generates multiple search queries based on a 
single input query. Generate multiple search queries related to: {{question}}
Output ({self.config.fusion_queries} queries):"""

        prompt = ChatPromptTemplate.from_template(template)
        generate_queries = (
            prompt 
            | self.llm
            | StrOutputParser()
            | (lambda x: x.split("\n"))
        )
        
        return generate_queries
    
    def _build_decomposition_chain(self):
        """Build Query Decomposition chain"""
        template = f"""You are a helpful assistant that generates multiple sub-questions related to
an input question. The goal is to break down the input into a set of sub-problems / sub-questions
that can be answered in isolation. Generate multiple search queries related to: {{question}}
Output ({self.config.max_sub_questions} queries):"""

        prompt = ChatPromptTemplate.from_template(template)
        generate_queries = (
            prompt 
            | self.llm
            | StrOutputParser()
            | (lambda x: x.split("\n"))
        )
        
        return generate_queries
    
    def _build_step_back_chain(self):
        """Build Step-Back prompting chain"""
        if self.config.use_few_shot_examples:
            # Few-shot examples for better step-back generation
            examples = [
                {
                    "input": "Could the members of The Police perform lawful arrests?",
                    "output": "what can the members of The Police do?",
                },
                {
                    "input": "Jan Sindel's was born in what country?",
                    "output": "what is Jan Sindel's personal history?",
                },
                {
                    "input": "What is the specific implementation of transformer attention in GPT-4?",
                    "output": "what are transformer architectures and attention mechanisms?",
                },
            ]
            
            example_prompt = ChatPromptTemplate.from_messages([
                ("human", "{input}"),
                ("ai", "{output}")
            ])
            
            few_shot_prompt = FewShotChatMessagePromptTemplate(
                example_prompt=example_prompt,
                examples=examples,
            )
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert at world knowledge. Your task is to step back and "
                "paraphrase a question to a more generic step-back question, which is easier to answer. "
                "Here are a few examples:"),
                few_shot_prompt,
                ("user", "{question}"),
            ])
        else:
            template = """You are an expert at world knowledge. Your task is to step back and
paraphrase a question to a more generic step-back question, which is easier to answer.

Question: {question}
Step-back question:"""
            prompt = ChatPromptTemplate.from_template(template)
        
        generate_step_back = prompt | self.llm | StrOutputParser()
        return generate_step_back
    
    def _build_hyde_chain(self):
        """Build HyDE (Hypothetical Document Embeddings) chain"""
        template = """Please write a scientific paper passage to answer the question.
Question: {question}
Passage:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        generate_hypothetical_doc = (
            prompt 
            | ChatOpenAI(temperature=self.config.hyde_model_temperature)
            | StrOutputParser()
        )
        
        return generate_hypothetical_doc
    
    def load_documents(self, web_paths: List[str] = None, documents: List[str] = None):
        """Load and index documents for retrieval"""
        if web_paths:
            # Load from web
            loader = WebBaseLoader(web_paths=web_paths)
            docs = loader.load()
        elif documents:
            # Load from provided documents
            from langchain_core.documents import Document
            docs = [Document(page_content=doc, metadata={"source": f"doc_{i}"}) 
                   for i, doc in enumerate(documents)]
        else:
            raise ValueError("Either web_paths or documents must be provided")
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=500,
            chunk_overlap=50
        )
        splits = text_splitter.split_documents(docs)
        
        # Store for BM25 indexing
        self.documents = [doc.page_content for doc in splits]
        
        # Create BM25 index for keyword search
        tokenized_docs = [doc.split(" ") for doc in self.documents]
        self.bm25 = BM25Okapi(tokenized_docs)
        
        # Create vector store
        if self.embeddings:
            self.vectorstore = Chroma.from_documents(
                documents=splits,
                embedding=self.embeddings
            )
        else:
            # Use sentence transformer for embeddings
            embeddings_list = self.sentence_model.encode(self.documents)
            # Create FAISS index
            dimension = embeddings_list.shape[1]
            self.faiss_index = faiss.IndexFlatIP(dimension)  # Inner product for similarity
            self.faiss_index.add(embeddings_list.astype('float32'))
        
        self.retriever = self.vectorstore.as_retriever() if self.vectorstore else None
        print(f"✅ Loaded and indexed {len(splits)} document chunks")
    
    def _get_unique_union(self, documents: List[List]) -> List:
        """Get unique union of retrieved documents"""
        flattened_docs = [dumps(doc) for sublist in documents for doc in sublist]
        unique_docs = list(set(flattened_docs))
        return [loads(doc) for doc in unique_docs]
    
    def _reciprocal_rank_fusion(self, results: List[List], k: int = 60) -> List[Tuple]:
        """Reciprocal Rank Fusion for re-ranking documents"""
        fused_scores = {}
        
        for docs in results:
            for rank, doc in enumerate(docs):
                doc_str = dumps(doc)
                if doc_str not in fused_scores:
                    fused_scores[doc_str] = 0
                # Core RRF: higher-ranked documents get larger scores
                fused_scores[doc_str] += 1 / (rank + k)
        
        # Sort by fused scores in descending order
        reranked_results = [
            (loads(doc), score)
            for doc, score in sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return reranked_results
    
    def _hybrid_search(self, query: str, top_k: int = 5) -> List:
        """Combine vector similarity and BM25 keyword search"""
        results = []
        
        # Vector search
        if self.retriever:
            vector_docs = self.retriever.get_relevant_documents(query)
            results.extend(vector_docs[:top_k//2])
        
        # BM25 keyword search
        if self.bm25:
            tokenized_query = query.split(" ")
            bm25_scores = self.bm25.get_scores(tokenized_query)
            top_indices = np.argsort(bm25_scores)[-top_k//2:][::-1]
            
            from langchain_core.documents import Document
            bm25_docs = [
                Document(page_content=self.documents[i], metadata={"score": bm25_scores[i], "source": f"bm25_{i}"})
                for i in top_indices if bm25_scores[i] > 0
            ]
            results.extend(bm25_docs)
        
        return results[:top_k]
    
    async def transform_query_multi_query(self, question: str) -> List:
        """Transform query using Multi-Query technique"""
        if not self.config.use_multi_query:
            return []
        
        print("🔄 Applying Multi-Query transformation...")
        generated_queries = self.multi_query_chain.invoke({"question": question})
        print(f"Generated {len(generated_queries)} query variations")
        
        # Retrieve for all queries
        all_docs = []
        for query in generated_queries:
            if self.retriever:
                docs = self.retriever.get_relevant_documents(query.strip())
                all_docs.append(docs)
        
        return self._get_unique_union(all_docs)
    
    async def transform_query_rag_fusion(self, question: str) -> List[Tuple]:
        """Transform query using RAG-Fusion with RRF"""
        if not self.config.use_rag_fusion:
            return []
        
        print("🔄 Applying RAG-Fusion transformation...")
        generated_queries = self.rag_fusion_chain.invoke({"question": question})
        print(f"Generated {len(generated_queries)} fusion queries")
        
        # Retrieve for all queries
        all_docs = []
        for query in generated_queries:
            if query.strip():
                docs = self._hybrid_search(query.strip())
                all_docs.append(docs)
        
        # Apply Reciprocal Rank Fusion
        return self._reciprocal_rank_fusion(all_docs, k=self.config.rrr_k_value)
    
    async def transform_query_decomposition(self, question: str) -> List:
        """Transform query using Decomposition"""
        if not self.config.use_decomposition:
            return []
        
        print("🔄 Applying Query Decomposition...")
        sub_questions = self.decomposition_chain.invoke({"question": question})
        print(f"Generated {len(sub_questions)} sub-questions")
        
        # Answer each sub-question
        sub_answers = []
        for sub_q in sub_questions:
            if sub_q.strip():
                docs = self._hybrid_search(sub_q.strip())
                # Generate answer for this sub-question
                context = "\n".join([doc.page_content for doc in docs])
                
                answer_prompt = f"""Based on the following context, answer this specific question:
Context: {context}
Question: {sub_q}
Answer:"""
                
                answer = self.llm.invoke(answer_prompt).content
                sub_answers.append({"question": sub_q, "answer": answer, "docs": docs})
        
        return sub_answers
    
    async def transform_query_step_back(self, question: str) -> Dict[str, List]:
        """Transform query using Step-Back prompting"""
        if not self.config.use_step_back:
            return {}
        
        print("🔄 Applying Step-Back transformation...")
        step_back_question = self.step_back_chain.invoke({"question": question})
        print(f"Step-back question: {step_back_question}")
        
        # Retrieve for both original and step-back questions
        normal_docs = self._hybrid_search(question)
        step_back_docs = self._hybrid_search(step_back_question)
        
        return {
            "normal_context": normal_docs,
            "step_back_context": step_back_docs,
            "step_back_question": step_back_question
        }
    
    async def transform_query_hyde(self, question: str) -> List:
        """Transform query using HyDE"""
        if not self.config.use_hyde:
            return []
        
        print("🔄 Applying HyDE transformation...")
        hypothetical_doc = self.hyde_chain.invoke({"question": question})
        print(f"Generated hypothetical document ({len(hypothetical_doc)} chars)")
        
        # Use hypothetical document for retrieval
        return self._hybrid_search(hypothetical_doc)
    
    async def comprehensive_query_processing(self, question: str) -> Dict[str, Any]:
        """Apply all enabled query transformation techniques"""
        print(f"\n🚀 Processing query: '{question}'")
        print("=" * 50)
        
        results = {}
        
        # Apply all transformation techniques
        if self.config.use_multi_query:
            results["multi_query"] = await self.transform_query_multi_query(question)
        
        if self.config.use_rag_fusion:
            results["rag_fusion"] = await self.transform_query_rag_fusion(question)
        
        if self.config.use_decomposition:
            results["decomposition"] = await self.transform_query_decomposition(question)
        
        if self.config.use_step_back:
            results["step_back"] = await self.transform_query_step_back(question)
        
        if self.config.use_hyde:
            results["hyde"] = await self.transform_query_hyde(question)
        
        return results
    
    def synthesize_final_answer(self, question: str, transformation_results: Dict[str, Any]) -> str:
        """Synthesize final answer from all transformation results"""
        print("\n🎯 Synthesizing final answer from all transformations...")
        
        # Collect all relevant context
        all_context = []
        
        # Multi-query context
        if "multi_query" in transformation_results:
            multi_context = [doc.page_content for doc in transformation_results["multi_query"][:3]]
            all_context.extend(multi_context)
        
        # RAG-Fusion context (top-ranked)
        if "rag_fusion" in transformation_results:
            fusion_context = [doc.page_content for doc, score in transformation_results["rag_fusion"][:3]]
            all_context.extend(fusion_context)
        
        # Decomposition context
        if "decomposition" in transformation_results:
            decomp_context = []
            for sub_result in transformation_results["decomposition"]:
                decomp_context.append(f"Q: {sub_result['question']}\nA: {sub_result['answer']}")
            all_context.extend(decomp_context)
        
        # Step-back context
        if "step_back" in transformation_results:
            step_back_data = transformation_results["step_back"]
            step_context = [doc.page_content for doc in step_back_data.get("normal_context", [])]
            step_back_context = [doc.page_content for doc in step_back_data.get("step_back_context", [])]
            all_context.extend(step_context)
            all_context.extend(step_back_context)
        
        # HyDE context
        if "hyde" in transformation_results:
            hyde_context = [doc.page_content for doc in transformation_results["hyde"][:3]]
            all_context.extend(hyde_context)
        
        # Remove duplicates and limit context
        unique_context = list(set(all_context))[:10]  # Limit to top 10 unique contexts
        
        # Generate final answer
        synthesis_prompt = f"""You are an expert assistant. Based on the comprehensive context gathered from multiple advanced retrieval techniques, provide a thorough and accurate answer to the user's question.

Comprehensive Context:
{chr(10).join(f"{i+1}. {ctx}" for i, ctx in enumerate(unique_context))}

Original Question: {question}

Provide a comprehensive answer that synthesizes information from the context above:"""

        final_answer = self.llm.invoke(synthesis_prompt).content
        
        return final_answer
    
    async def advanced_rag_query(self, question: str) -> Dict[str, Any]:
        """Main interface for advanced RAG querying"""
        # Apply all transformations
        transformation_results = await self.comprehensive_query_processing(question)
        
        # Synthesize final answer
        final_answer = self.synthesize_final_answer(question, transformation_results)
        
        return {
            "question": question,
            "final_answer": final_answer,
            "transformation_results": transformation_results,
            "techniques_used": [k for k in transformation_results.keys()],
            "total_contexts": sum(len(v) if isinstance(v, list) else 1 for v in transformation_results.values())
        }


# Evaluation and comparison utilities
class RAGTechniqueEvaluator:
    """Evaluate and compare different RAG transformation techniques"""
    
    def __init__(self, rag_transformer: AdvancedRAGQueryTransformer):
        self.rag_transformer = rag_transformer
    
    async def compare_techniques(self, question: str) -> Dict[str, Any]:
        """Compare all transformation techniques for a single question"""
        print(f"\n📊 Evaluating techniques for: '{question}'")
        
        results = {}
        
        # Test each technique individually
        techniques = {
            "multi_query": self.rag_transformer.transform_query_multi_query,
            "rag_fusion": self.rag_transformer.transform_query_rag_fusion,
            "decomposition": self.rag_transformer.transform_query_decomposition,
            "step_back": self.rag_transformer.transform_query_step_back,
            "hyde": self.rag_transformer.transform_query_hyde,
        }
        
        for technique_name, technique_func in techniques.items():
            if getattr(self.rag_transformer.config, f"use_{technique_name}"):
                try:
                    technique_results = await technique_func(question)
                    results[technique_name] = {
                        "results": technique_results,
                        "count": len(technique_results) if isinstance(technique_results, list) else 1,
                        "status": "success"
                    }
                except Exception as e:
                    results[technique_name] = {
                        "error": str(e),
                        "status": "failed"
                    }
        
        return results


# Example usage and testing
async def demo_advanced_rag():
    """Demonstrate the advanced RAG system"""
    
    # Configuration
    config = QueryTransformationConfig(
        use_multi_query=True,
        use_rag_fusion=True,
        use_decomposition=True,
        use_step_back=True,
        use_hyde=True,
        num_multi_queries=4,
        fusion_queries=3,
        max_sub_questions=3
    )
    
    # Initialize system
    groq_api_key = os.getenv("GROQ_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not groq_api_key and not openai_api_key:
        print("❌ Please set GROQ_API_KEY or OPENAI_API_KEY environment variable")
        return
    
    rag_system = AdvancedRAGQueryTransformer(
        groq_api_key=groq_api_key,
        openai_api_key=openai_api_key,
        config=config
    )
    
    # Load example documents (you can replace with your own)
    example_documents = [
        "Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.",
        "Neural networks are computational models inspired by biological neural networks in animal brains.",
        "Deep learning uses artificial neural networks with multiple layers to model and understand complex patterns in data.",
        "Natural language processing (NLP) is a branch of AI that helps computers understand and interpret human language.",
        "Computer vision enables machines to interpret and make decisions based on visual data from the world.",
        "Reinforcement learning is a type of machine learning where agents learn to make decisions through trial and error.",
        "Transfer learning allows models trained on one task to be adapted for related tasks with less training data.",
        "Transformer architectures have revolutionized natural language processing and are the basis for models like GPT and BERT."
    ]
    
    rag_system.load_documents(documents=example_documents)
    
    # Test questions
    test_questions = [
        "What is machine learning and how does it work?",
        "How do neural networks process information?",
        "What are the main types of AI and their applications?"
    ]
    
    for question in test_questions:
        print("\n" + "="*80)
        result = await rag_system.advanced_rag_query(question)
        
        print(f"\n📋 FINAL RESULT:")
        print(f"Question: {result['question']}")
        print(f"Answer: {result['final_answer']}")
        print(f"Techniques Used: {', '.join(result['techniques_used'])}")
        print(f"Total Contexts Processed: {result['total_contexts']}")


if __name__ == "__main__":
    # Run the demo
    asyncio.run(demo_advanced_rag())