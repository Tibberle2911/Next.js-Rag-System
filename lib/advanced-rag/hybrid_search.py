"""
Hybrid Search Implementation for Advanced RAG
Combines dense vector search, sparse keyword search (BM25), and semantic reranking
"""

import numpy as np
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
import faiss
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re


@dataclass
class HybridSearchConfig:
    """Configuration for hybrid search parameters"""
    # Vector search settings
    vector_top_k: int = 10
    vector_weight: float = 0.5
    
    # BM25 settings
    bm25_top_k: int = 10
    bm25_weight: float = 0.3
    
    # TF-IDF settings
    tfidf_weight: float = 0.2
    
    # Reranking settings
    rerank_top_k: int = 5
    use_semantic_reranking: bool = True
    
    # Text preprocessing
    min_token_length: int = 2
    remove_stopwords: bool = True


class HybridSearchEngine:
    """Advanced hybrid search combining multiple retrieval methods"""
    
    def __init__(self, config: HybridSearchConfig = None):
        self.config = config or HybridSearchConfig()
        
        # Initialize models
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.rerank_model = SentenceTransformer('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        # Search indexes
        self.faiss_index = None
        self.bm25_index = None
        self.tfidf_vectorizer = None
        self.tfidf_matrix = None
        
        # Document storage
        self.documents = []
        self.document_embeddings = None
        self.processed_docs = []
        
        # Stopwords for preprocessing
        self.stopwords = {
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", 
            "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 
            'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 
            'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 
            'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
            'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 
            'while', 'of', 'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after', 
            'above', 'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 
            'further', 'then', 'once'
        }
    
    def preprocess_text(self, text: str) -> str:
        """Preprocess text for better search performance"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
        
        # Split into tokens
        tokens = text.split()
        
        # Filter tokens
        filtered_tokens = []
        for token in tokens:
            if (len(token) >= self.config.min_token_length and 
                (not self.config.remove_stopwords or token not in self.stopwords)):
                filtered_tokens.append(token)
        
        return ' '.join(filtered_tokens)
    
    def build_indexes(self, documents: List[str]):
        """Build all search indexes from documents"""
        print("🔨 Building hybrid search indexes...")
        
        self.documents = documents
        self.processed_docs = [self.preprocess_text(doc) for doc in documents]
        
        # 1. Build dense vector index (FAISS)
        self._build_vector_index()
        
        # 2. Build sparse keyword index (BM25)
        self._build_bm25_index()
        
        # 3. Build TF-IDF index
        self._build_tfidf_index()
        
        print(f"✅ Built indexes for {len(documents)} documents")
    
    def _build_vector_index(self):
        """Build FAISS vector index for dense retrieval"""
        print("  📊 Building dense vector index...")
        
        # Generate embeddings
        self.document_embeddings = self.sentence_model.encode(self.documents, show_progress_bar=True)
        
        # Create FAISS index
        dimension = self.document_embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(self.document_embeddings)
        self.faiss_index.add(self.document_embeddings.astype('float32'))
    
    def _build_bm25_index(self):
        """Build BM25 index for sparse keyword retrieval"""
        print("  🔍 Building BM25 keyword index...")
        
        tokenized_docs = [doc.split() for doc in self.processed_docs]
        self.bm25_index = BM25Okapi(tokenized_docs)
    
    def _build_tfidf_index(self):
        """Build TF-IDF index for term-based retrieval"""
        print("  📝 Building TF-IDF index...")
        
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=10000,
            stop_words=None,  # We handle stopwords in preprocessing
            ngram_range=(1, 2),  # Include bigrams
            min_df=1,
            max_df=0.95
        )
        
        self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(self.processed_docs)
    
    def vector_search(self, query: str, top_k: int = None) -> List[Tuple[int, float]]:
        """Dense vector similarity search"""
        top_k = top_k or self.config.vector_top_k
        
        if self.faiss_index is None:
            return []
        
        # Encode query
        query_embedding = self.sentence_model.encode([query])
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.faiss_index.search(query_embedding.astype('float32'), top_k)
        
        return [(int(idx), float(score)) for idx, score in zip(indices[0], scores[0]) if idx != -1]
    
    def bm25_search(self, query: str, top_k: int = None) -> List[Tuple[int, float]]:
        """BM25 keyword search"""
        top_k = top_k or self.config.bm25_top_k
        
        if self.bm25_index is None:
            return []
        
        # Preprocess query
        processed_query = self.preprocess_text(query)
        query_tokens = processed_query.split()
        
        if not query_tokens:
            return []
        
        # Get BM25 scores
        scores = self.bm25_index.get_scores(query_tokens)
        
        # Get top k
        top_indices = np.argsort(scores)[-top_k:][::-1]
        
        return [(int(idx), float(scores[idx])) for idx in top_indices if scores[idx] > 0]
    
    def tfidf_search(self, query: str, top_k: int = None) -> List[Tuple[int, float]]:
        """TF-IDF cosine similarity search"""
        top_k = top_k or self.config.bm25_top_k
        
        if self.tfidf_vectorizer is None or self.tfidf_matrix is None:
            return []
        
        # Vectorize query
        processed_query = self.preprocess_text(query)
        query_vector = self.tfidf_vectorizer.transform([processed_query])
        
        # Compute cosine similarities
        similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
        
        # Get top k
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        return [(int(idx), float(similarities[idx])) for idx in top_indices if similarities[idx] > 0]
    
    def hybrid_search(self, query: str, top_k: int = None) -> List[Tuple[int, float, Dict[str, float]]]:
        """Combine all search methods with weighted scoring"""
        top_k = top_k or self.config.rerank_top_k
        
        # Get results from each method
        vector_results = self.vector_search(query)
        bm25_results = self.bm25_search(query)
        tfidf_results = self.tfidf_search(query)
        
        # Combine scores
        combined_scores = {}
        method_scores = {}
        
        # Process vector results
        max_vector_score = max([score for _, score in vector_results], default=1.0)
        for idx, score in vector_results:
            normalized_score = score / max_vector_score if max_vector_score > 0 else 0
            combined_scores[idx] = combined_scores.get(idx, 0) + normalized_score * self.config.vector_weight
            if idx not in method_scores:
                method_scores[idx] = {}
            method_scores[idx]['vector'] = normalized_score
        
        # Process BM25 results
        max_bm25_score = max([score for _, score in bm25_results], default=1.0)
        for idx, score in bm25_results:
            normalized_score = score / max_bm25_score if max_bm25_score > 0 else 0
            combined_scores[idx] = combined_scores.get(idx, 0) + normalized_score * self.config.bm25_weight
            if idx not in method_scores:
                method_scores[idx] = {}
            method_scores[idx]['bm25'] = normalized_score
        
        # Process TF-IDF results
        max_tfidf_score = max([score for _, score in tfidf_results], default=1.0)
        for idx, score in tfidf_results:
            normalized_score = score / max_tfidf_score if max_tfidf_score > 0 else 0
            combined_scores[idx] = combined_scores.get(idx, 0) + normalized_score * self.config.tfidf_weight
            if idx not in method_scores:
                method_scores[idx] = {}
            method_scores[idx]['tfidf'] = normalized_score
        
        # Sort by combined score
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Return top k with detailed scores
        results = []
        for idx, score in sorted_results[:top_k]:
            score_details = method_scores.get(idx, {})
            results.append((idx, score, score_details))
        
        return results
    
    def semantic_reranking(self, query: str, candidate_indices: List[int]) -> List[Tuple[int, float]]:
        """Rerank candidates using cross-encoder model"""
        if not self.config.use_semantic_reranking or not candidate_indices:
            return [(idx, 0.0) for idx in candidate_indices]
        
        # Prepare query-document pairs
        pairs = [(query, self.documents[idx]) for idx in candidate_indices]
        
        # Get reranking scores
        rerank_scores = self.rerank_model.predict(pairs)
        
        # Sort by rerank score
        scored_candidates = list(zip(candidate_indices, rerank_scores))
        scored_candidates.sort(key=lambda x: x[1], reverse=True)
        
        return scored_candidates
    
    def search(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Main search interface with full hybrid pipeline"""
        top_k = top_k or self.config.rerank_top_k
        
        print(f"🔍 Hybrid search for: '{query}'")
        
        # Stage 1: Hybrid retrieval
        hybrid_results = self.hybrid_search(query, top_k * 2)  # Get more candidates for reranking
        
        if not hybrid_results:
            return []
        
        # Stage 2: Semantic reranking (if enabled)
        if self.config.use_semantic_reranking and len(hybrid_results) > 1:
            candidate_indices = [idx for idx, _, _ in hybrid_results]
            reranked_results = self.semantic_reranking(query, candidate_indices)
            
            # Combine hybrid scores with rerank scores
            hybrid_score_map = {idx: (score, details) for idx, score, details in hybrid_results}
            
            final_results = []
            for idx, rerank_score in reranked_results[:top_k]:
                hybrid_score, score_details = hybrid_score_map[idx]
                
                final_results.append({
                    "document_index": idx,
                    "document": self.documents[idx],
                    "hybrid_score": hybrid_score,
                    "rerank_score": float(rerank_score),
                    "final_score": (hybrid_score + float(rerank_score)) / 2,  # Average of hybrid and rerank
                    "score_breakdown": score_details
                })
        else:
            # No reranking, use hybrid scores only
            final_results = []
            for idx, score, details in hybrid_results[:top_k]:
                final_results.append({
                    "document_index": idx,
                    "document": self.documents[idx],
                    "hybrid_score": score,
                    "rerank_score": None,
                    "final_score": score,
                    "score_breakdown": details
                })
        
        # Sort by final score
        final_results.sort(key=lambda x: x["final_score"], reverse=True)
        
        print(f"  📊 Found {len(final_results)} results")
        return final_results
    
    def explain_search(self, query: str, top_k: int = 3) -> Dict[str, Any]:
        """Detailed explanation of search process for debugging"""
        print(f"\n🔬 DETAILED SEARCH ANALYSIS")
        print(f"Query: '{query}'")
        print("=" * 50)
        
        # Individual method results
        vector_results = self.vector_search(query, 5)
        bm25_results = self.bm25_search(query, 5)
        tfidf_results = self.tfidf_search(query, 5)
        
        print(f"\n📊 VECTOR SEARCH (top 5):")
        for idx, score in vector_results:
            doc_preview = self.documents[idx][:100] + "..." if len(self.documents[idx]) > 100 else self.documents[idx]
            print(f"  {score:.4f} | Doc {idx}: {doc_preview}")
        
        print(f"\n🔍 BM25 SEARCH (top 5):")
        for idx, score in bm25_results:
            doc_preview = self.documents[idx][:100] + "..." if len(self.documents[idx]) > 100 else self.documents[idx]
            print(f"  {score:.4f} | Doc {idx}: {doc_preview}")
        
        print(f"\n📝 TF-IDF SEARCH (top 5):")
        for idx, score in tfidf_results:
            doc_preview = self.documents[idx][:100] + "..." if len(self.documents[idx]) > 100 else self.documents[idx]
            print(f"  {score:.4f} | Doc {idx}: {doc_preview}")
        
        # Combined hybrid results
        hybrid_results = self.hybrid_search(query, 10)
        
        print(f"\n🔀 HYBRID COMBINED (top 5):")
        for idx, score, details in hybrid_results[:5]:
            doc_preview = self.documents[idx][:100] + "..." if len(self.documents[idx]) > 100 else self.documents[idx]
            print(f"  {score:.4f} | Doc {idx}: {doc_preview}")
            print(f"    └─ Breakdown: {details}")
        
        # Final search results
        final_results = self.search(query, top_k)
        
        print(f"\n🎯 FINAL RESULTS (top {top_k}):")
        for i, result in enumerate(final_results, 1):
            doc_preview = result["document"][:100] + "..." if len(result["document"]) > 100 else result["document"]
            print(f"  {i}. Final Score: {result['final_score']:.4f}")
            print(f"     Hybrid: {result['hybrid_score']:.4f} | Rerank: {result['rerank_score']}")
            print(f"     Doc: {doc_preview}")
            print(f"     Breakdown: {result['score_breakdown']}")
        
        return {
            "query": query,
            "vector_results": vector_results,
            "bm25_results": bm25_results,
            "tfidf_results": tfidf_results,
            "hybrid_results": hybrid_results,
            "final_results": final_results
        }


# Example usage and testing
async def demo_hybrid_search():
    """Demonstrate hybrid search capabilities"""
    
    # Sample documents for testing
    documents = [
        "Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.",
        "Neural networks are computational models inspired by biological neural networks in animal brains.",
        "Deep learning uses artificial neural networks with multiple layers to model complex patterns in data.",
        "Natural language processing helps computers understand human language through various computational techniques.",
        "Computer vision allows machines to interpret and make decisions based on visual information from images and videos.",
        "Reinforcement learning teaches agents to make decisions through trial and error in an environment.",
        "Transfer learning allows pre-trained models to be adapted for new but related tasks with less training data.",
        "Transformer architectures revolutionized NLP and are the foundation of models like GPT and BERT.",
        "Supervised learning uses labeled data to train models that can make predictions on new, unseen data.",
        "Unsupervised learning finds patterns in data without labeled examples, using techniques like clustering.",
        "Data preprocessing is crucial for machine learning, involving cleaning, normalization, and feature engineering.",
        "Feature engineering involves selecting and transforming variables to improve model performance.",
        "Cross-validation is a technique to assess how well a model generalizes to unseen data.",
        "Overfitting occurs when a model learns the training data too well but fails on new data.",
        "Regularization techniques help prevent overfitting by adding constraints to model complexity."
    ]
    
    # Initialize hybrid search
    config = HybridSearchConfig(
        vector_top_k=8,
        bm25_top_k=8,
        vector_weight=0.4,
        bm25_weight=0.4,
        tfidf_weight=0.2,
        use_semantic_reranking=True,
        rerank_top_k=5
    )
    
    search_engine = HybridSearchEngine(config)
    search_engine.build_indexes(documents)
    
    # Test queries
    test_queries = [
        "What is machine learning?",
        "How do neural networks work?",
        "Explain deep learning techniques",
        "What is overfitting in ML?",
        "How to prevent overfitting?"
    ]
    
    for query in test_queries:
        print("\n" + "="*80)
        
        # Quick search
        results = search_engine.search(query, top_k=3)
        
        print(f"\n📋 RESULTS for '{query}':")
        for i, result in enumerate(results, 1):
            print(f"\n{i}. Score: {result['final_score']:.4f}")
            print(f"   Document: {result['document']}")
            print(f"   Breakdown: Vector={result['score_breakdown'].get('vector', 0):.3f}, "
                  f"BM25={result['score_breakdown'].get('bm25', 0):.3f}, "
                  f"TF-IDF={result['score_breakdown'].get('tfidf', 0):.3f}")
    
    # Detailed analysis for one query
    print("\n" + "="*80)
    print("DETAILED ANALYSIS EXAMPLE")
    search_engine.explain_search("What causes overfitting in machine learning?", top_k=3)


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_hybrid_search())