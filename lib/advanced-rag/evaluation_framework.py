"""
Advanced Query Evaluation and Performance Metrics for RAG Systems
Implements comprehensive evaluation methods for query transformation techniques
"""

import time
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass, asdict
import json
import numpy as np
from collections import defaultdict
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# For semantic similarity evaluation
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# For BLEU and ROUGE metrics
try:
    from rouge_score import rouge_scorer
    from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
    import nltk
    # Download required NLTK data
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
except ImportError:
    print("Warning: ROUGE/BLEU evaluation requires 'rouge-score' and 'nltk' packages")


@dataclass
class EvaluationMetrics:
    """Comprehensive evaluation metrics for RAG systems"""
    
    # Retrieval Metrics
    retrieval_precision: float = 0.0
    retrieval_recall: float = 0.0
    retrieval_f1: float = 0.0
    retrieval_map: float = 0.0  # Mean Average Precision
    retrieval_ndcg: float = 0.0  # Normalized Discounted Cumulative Gain
    
    # Generation Quality Metrics
    bleu_score: float = 0.0
    rouge_1_f1: float = 0.0
    rouge_2_f1: float = 0.0
    rouge_l_f1: float = 0.0
    semantic_similarity: float = 0.0
    
    # Performance Metrics
    response_time: float = 0.0
    num_documents_retrieved: int = 0
    total_tokens_generated: int = 0
    
    # Quality Assessment
    answer_relevance: float = 0.0
    answer_completeness: float = 0.0
    factual_accuracy: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class TestCase:
    """Single test case for RAG evaluation"""
    question: str
    ground_truth_answer: str
    relevant_documents: List[str]
    difficulty: str = "medium"  # easy, medium, hard
    category: str = "general"
    metadata: Dict[str, Any] = None


class RAGEvaluationFramework:
    """Comprehensive evaluation framework for RAG systems"""
    
    def __init__(self, use_semantic_similarity: bool = True):
        self.use_semantic_similarity = use_semantic_similarity
        
        # Initialize evaluation models
        if use_semantic_similarity:
            self.similarity_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ROUGE scorer
        try:
            self.rouge_scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
            self.smoothing = SmoothingFunction().method4  # For BLEU
        except:
            self.rouge_scorer = None
            self.smoothing = None
            print("Warning: ROUGE scoring not available")
        
        # Test results storage
        self.evaluation_results = []
        self.technique_comparisons = {}
    
    def calculate_retrieval_metrics(self, retrieved_docs: List[str], relevant_docs: List[str]) -> Dict[str, float]:
        """Calculate retrieval performance metrics"""
        if not relevant_docs or not retrieved_docs:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "map": 0.0, "ndcg": 0.0}
        
        # Convert to sets for easier comparison
        retrieved_set = set(retrieved_docs)
        relevant_set = set(relevant_docs)
        
        # Basic precision, recall, F1
        true_positives = len(retrieved_set.intersection(relevant_set))
        precision = true_positives / len(retrieved_set) if retrieved_set else 0.0
        recall = true_positives / len(relevant_set) if relevant_set else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Mean Average Precision (simplified)
        map_score = precision  # Simplified MAP calculation
        
        # NDCG (simplified - assumes relevant docs have score 1, others 0)
        dcg = 0.0
        idcg = sum(1.0 / np.log2(i + 2) for i in range(min(len(relevant_set), len(retrieved_docs))))
        
        for i, doc in enumerate(retrieved_docs):
            if doc in relevant_set:
                dcg += 1.0 / np.log2(i + 2)
        
        ndcg = dcg / idcg if idcg > 0 else 0.0
        
        return {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "map": map_score,
            "ndcg": ndcg
        }
    
    def calculate_generation_metrics(self, generated_answer: str, ground_truth: str) -> Dict[str, float]:
        """Calculate generation quality metrics"""
        metrics = {"bleu": 0.0, "rouge_1_f1": 0.0, "rouge_2_f1": 0.0, "rouge_l_f1": 0.0, "semantic_similarity": 0.0}
        
        if not generated_answer or not ground_truth:
            return metrics
        
        # BLEU Score
        if self.smoothing:
            try:
                reference = [ground_truth.lower().split()]
                candidate = generated_answer.lower().split()
                bleu = sentence_bleu(reference, candidate, smoothing_function=self.smoothing)
                metrics["bleu"] = bleu
            except Exception as e:
                print(f"BLEU calculation error: {e}")
        
        # ROUGE Scores
        if self.rouge_scorer:
            try:
                rouge_scores = self.rouge_scorer.score(ground_truth, generated_answer)
                metrics["rouge_1_f1"] = rouge_scores['rouge1'].fmeasure
                metrics["rouge_2_f1"] = rouge_scores['rouge2'].fmeasure
                metrics["rouge_l_f1"] = rouge_scores['rougeL'].fmeasure
            except Exception as e:
                print(f"ROUGE calculation error: {e}")
        
        # Semantic Similarity
        if self.use_semantic_similarity:
            try:
                embeddings = self.similarity_model.encode([generated_answer, ground_truth])
                similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
                metrics["semantic_similarity"] = float(similarity)
            except Exception as e:
                print(f"Semantic similarity calculation error: {e}")
        
        return metrics
    
    def calculate_answer_quality_metrics(self, question: str, generated_answer: str, ground_truth: str) -> Dict[str, float]:
        """Calculate answer quality metrics using heuristics"""
        
        # Answer Relevance (how well the answer addresses the question)
        question_words = set(question.lower().split())
        answer_words = set(generated_answer.lower().split())
        word_overlap = len(question_words.intersection(answer_words))
        relevance = word_overlap / len(question_words) if question_words else 0.0
        
        # Answer Completeness (length and coverage compared to ground truth)
        gt_words = set(ground_truth.lower().split())
        answer_coverage = len(answer_words.intersection(gt_words)) / len(gt_words) if gt_words else 0.0
        length_ratio = min(len(generated_answer) / len(ground_truth), 1.0) if ground_truth else 0.0
        completeness = (answer_coverage + length_ratio) / 2.0
        
        # Factual Accuracy (simplified - based on key term overlap)
        # Extract potential facts (words longer than 4 characters)
        gt_facts = {word for word in ground_truth.lower().split() if len(word) > 4}
        answer_facts = {word for word in generated_answer.lower().split() if len(word) > 4}
        factual_accuracy = len(gt_facts.intersection(answer_facts)) / len(gt_facts) if gt_facts else 0.0
        
        return {
            "answer_relevance": relevance,
            "answer_completeness": completeness,
            "factual_accuracy": factual_accuracy
        }
    
    async def evaluate_single_query(self, rag_system, test_case: TestCase, technique: str = "comprehensive") -> EvaluationMetrics:
        """Evaluate a single query using the specified RAG technique"""
        start_time = time.time()
        
        try:
            # Get RAG response
            if technique == "comprehensive":
                result = await rag_system.advanced_rag_query(test_case.question)
                generated_answer = result["final_answer"]
                retrieved_docs = []
                
                # Extract retrieved documents from transformation results
                for tech_name, tech_results in result["transformation_results"].items():
                    if isinstance(tech_results, list):
                        for item in tech_results:
                            if hasattr(item, 'page_content'):
                                retrieved_docs.append(item.page_content)
                            elif isinstance(item, dict) and 'document' in item:
                                retrieved_docs.append(item['document'])
            
            elif technique == "multi_query":
                docs = await rag_system.transform_query_multi_query(test_case.question)
                retrieved_docs = [doc.page_content for doc in docs] if docs else []
                generated_answer = rag_system.synthesize_final_answer(test_case.question, {"multi_query": docs})
            
            elif technique == "rag_fusion":
                docs = await rag_system.transform_query_rag_fusion(test_case.question)
                retrieved_docs = [doc.page_content for doc, score in docs] if docs else []
                generated_answer = rag_system.synthesize_final_answer(test_case.question, {"rag_fusion": docs})
            
            else:
                # Basic RAG
                if hasattr(rag_system, 'retriever') and rag_system.retriever:
                    docs = rag_system.retriever.get_relevant_documents(test_case.question)
                    retrieved_docs = [doc.page_content for doc in docs]
                    generated_answer = rag_system.llm.invoke(f"Answer this question: {test_case.question}\n\nContext: {' '.join(retrieved_docs[:3])}").content
                else:
                    retrieved_docs = []
                    generated_answer = f"Unable to retrieve relevant documents for: {test_case.question}"
            
        except Exception as e:
            print(f"Error evaluating query '{test_case.question}': {e}")
            retrieved_docs = []
            generated_answer = f"Error processing query: {str(e)}"
        
        response_time = time.time() - start_time
        
        # Calculate all metrics
        retrieval_metrics = self.calculate_retrieval_metrics(retrieved_docs, test_case.relevant_documents)
        generation_metrics = self.calculate_generation_metrics(generated_answer, test_case.ground_truth_answer)
        quality_metrics = self.calculate_answer_quality_metrics(test_case.question, generated_answer, test_case.ground_truth_answer)
        
        # Combine all metrics
        evaluation_metrics = EvaluationMetrics(
            # Retrieval metrics
            retrieval_precision=retrieval_metrics["precision"],
            retrieval_recall=retrieval_metrics["recall"],
            retrieval_f1=retrieval_metrics["f1"],
            retrieval_map=retrieval_metrics["map"],
            retrieval_ndcg=retrieval_metrics["ndcg"],
            
            # Generation metrics
            bleu_score=generation_metrics["bleu"],
            rouge_1_f1=generation_metrics["rouge_1_f1"],
            rouge_2_f1=generation_metrics["rouge_2_f1"],
            rouge_l_f1=generation_metrics["rouge_l_f1"],
            semantic_similarity=generation_metrics["semantic_similarity"],
            
            # Performance metrics
            response_time=response_time,
            num_documents_retrieved=len(retrieved_docs),
            total_tokens_generated=len(generated_answer.split()),
            
            # Quality metrics
            answer_relevance=quality_metrics["answer_relevance"],
            answer_completeness=quality_metrics["answer_completeness"],
            factual_accuracy=quality_metrics["factual_accuracy"]
        )
        
        return evaluation_metrics
    
    async def evaluate_technique_comparison(self, rag_system, test_cases: List[TestCase], techniques: List[str]) -> Dict[str, Any]:
        """Compare multiple RAG techniques on a set of test cases"""
        print(f"🔬 Evaluating {len(techniques)} techniques on {len(test_cases)} test cases...")
        
        results = {}
        
        for technique in techniques:
            print(f"\n📊 Testing technique: {technique}")
            technique_results = []
            
            for i, test_case in enumerate(test_cases):
                print(f"  Processing test case {i+1}/{len(test_cases)}: {test_case.question[:50]}...")
                
                try:
                    metrics = await self.evaluate_single_query(rag_system, test_case, technique)
                    technique_results.append({
                        "test_case": test_case,
                        "metrics": metrics,
                        "generated_answer": "",  # Could store if needed
                    })
                except Exception as e:
                    print(f"    ❌ Error: {e}")
                    # Create empty metrics for failed cases
                    technique_results.append({
                        "test_case": test_case,
                        "metrics": EvaluationMetrics(),
                        "error": str(e)
                    })
            
            results[technique] = technique_results
        
        # Calculate aggregate statistics
        self.technique_comparisons = self._calculate_aggregate_metrics(results)
        
        return self.technique_comparisons
    
    def _calculate_aggregate_metrics(self, results: Dict[str, List]) -> Dict[str, Any]:
        """Calculate aggregate statistics across techniques"""
        aggregated = {}
        
        for technique, technique_results in results.items():
            # Extract metrics from successful evaluations
            valid_metrics = [r["metrics"] for r in technique_results if "error" not in r]
            
            if not valid_metrics:
                aggregated[technique] = {"error": "No successful evaluations"}
                continue
            
            # Calculate means and standard deviations
            metrics_dict = {}
            for metric_name in valid_metrics[0].to_dict().keys():
                values = [getattr(m, metric_name) for m in valid_metrics]
                metrics_dict[f"{metric_name}_mean"] = np.mean(values)
                metrics_dict[f"{metric_name}_std"] = np.std(values)
                metrics_dict[f"{metric_name}_values"] = values
            
            metrics_dict["num_successful"] = len(valid_metrics)
            metrics_dict["num_failed"] = len(technique_results) - len(valid_metrics)
            
            aggregated[technique] = metrics_dict
        
        return aggregated
    
    def generate_evaluation_report(self, output_file: Optional[str] = None) -> str:
        """Generate a comprehensive evaluation report"""
        if not self.technique_comparisons:
            return "No evaluation results available. Run evaluate_technique_comparison() first."
        
        report_lines = []
        report_lines.append("# RAG TECHNIQUE EVALUATION REPORT")
        report_lines.append("=" * 50)
        report_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append("")
        
        # Summary table
        report_lines.append("## SUMMARY COMPARISON")
        report_lines.append("")
        
        # Key metrics comparison
        key_metrics = [
            "retrieval_f1_mean", "bleu_score_mean", "rouge_1_f1_mean", 
            "semantic_similarity_mean", "response_time_mean", "answer_relevance_mean"
        ]
        
        for technique, metrics in self.technique_comparisons.items():
            if "error" in metrics:
                continue
                
            report_lines.append(f"### {technique.upper()}")
            report_lines.append("")
            
            for metric in key_metrics:
                if metric in metrics:
                    value = metrics[metric]
                    std = metrics.get(metric.replace("_mean", "_std"), 0)
                    report_lines.append(f"- {metric.replace('_mean', '').replace('_', ' ').title()}: {value:.4f} ± {std:.4f}")
            
            report_lines.append(f"- Success Rate: {metrics.get('num_successful', 0)} / {metrics.get('num_successful', 0) + metrics.get('num_failed', 0)}")
            report_lines.append("")
        
        # Detailed analysis
        report_lines.append("## DETAILED ANALYSIS")
        report_lines.append("")
        
        # Find best performing technique for each metric
        best_techniques = {}
        for metric in key_metrics:
            best_score = -1
            best_technique = ""
            
            for technique, metrics in self.technique_comparisons.items():
                if "error" in metrics:
                    continue
                    
                score = metrics.get(metric, 0)
                if score > best_score:
                    best_score = score
                    best_technique = technique
            
            best_techniques[metric] = (best_technique, best_score)
        
        report_lines.append("### Best Performing Techniques by Metric:")
        report_lines.append("")
        
        for metric, (technique, score) in best_techniques.items():
            metric_name = metric.replace("_mean", "").replace("_", " ").title()
            report_lines.append(f"- **{metric_name}**: {technique} ({score:.4f})")
        
        report_lines.append("")
        
        # Recommendations
        report_lines.append("## RECOMMENDATIONS")
        report_lines.append("")
        
        # Simple heuristics for recommendations
        overall_scores = {}
        for technique, metrics in self.technique_comparisons.items():
            if "error" in metrics:
                continue
            
            # Weighted average of key metrics
            score = (
                metrics.get("retrieval_f1_mean", 0) * 0.2 +
                metrics.get("semantic_similarity_mean", 0) * 0.2 +
                metrics.get("answer_relevance_mean", 0) * 0.2 +
                metrics.get("rouge_1_f1_mean", 0) * 0.15 +
                metrics.get("bleu_score_mean", 0) * 0.15 +
                (1.0 / max(metrics.get("response_time_mean", 1), 0.1)) * 0.1  # Prefer faster response
            )
            overall_scores[technique] = score
        
        # Sort techniques by overall score
        ranked_techniques = sorted(overall_scores.items(), key=lambda x: x[1], reverse=True)
        
        report_lines.append("### Technique Rankings (Overall Performance):")
        report_lines.append("")
        
        for i, (technique, score) in enumerate(ranked_techniques, 1):
            report_lines.append(f"{i}. **{technique}** - Overall Score: {score:.4f}")
            
            # Add specific recommendations
            metrics = self.technique_comparisons[technique]
            speed = "Fast" if metrics.get("response_time_mean", 10) < 2.0 else "Slow"
            accuracy = "High" if metrics.get("semantic_similarity_mean", 0) > 0.7 else "Medium"
            
            report_lines.append(f"   - Speed: {speed} ({metrics.get('response_time_mean', 0):.2f}s avg)")
            report_lines.append(f"   - Accuracy: {accuracy} (semantic similarity: {metrics.get('semantic_similarity_mean', 0):.3f})")
            report_lines.append("")
        
        report = "\n".join(report_lines)
        
        # Save to file if specified
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"📄 Report saved to: {output_file}")
        
        return report
    
    def plot_comparison_charts(self, save_path: Optional[str] = None):
        """Create visualization charts for technique comparison"""
        if not self.technique_comparisons:
            print("No evaluation results available for plotting.")
            return
        
        # Set up the plotting style
        plt.style.use('default')
        sns.set_palette("husl")
        
        # Prepare data for plotting
        techniques = []
        metrics_data = defaultdict(list)
        
        for technique, metrics in self.technique_comparisons.items():
            if "error" in metrics:
                continue
                
            techniques.append(technique)
            
            # Extract key metrics for plotting
            key_metrics = [
                "retrieval_f1_mean", "bleu_score_mean", "rouge_1_f1_mean",
                "semantic_similarity_mean", "answer_relevance_mean", "response_time_mean"
            ]
            
            for metric in key_metrics:
                metrics_data[metric].append(metrics.get(metric, 0))
        
        # Create subplots
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('RAG Technique Comparison', fontsize=16, fontweight='bold')
        
        # Plot each metric
        metric_titles = [
            "Retrieval F1 Score", "BLEU Score", "ROUGE-1 F1",
            "Semantic Similarity", "Answer Relevance", "Response Time (s)"
        ]
        
        for idx, (metric, title) in enumerate(zip(key_metrics, metric_titles)):
            row, col = idx // 3, idx % 3
            ax = axes[row, col]
            
            values = metrics_data[metric]
            bars = ax.bar(techniques, values, alpha=0.7)
            
            # Color bars based on performance (except response time where lower is better)
            if metric == "response_time_mean":
                colors = ['red' if v > np.mean(values) else 'green' for v in values]
            else:
                colors = ['green' if v > np.mean(values) else 'red' for v in values]
            
            for bar, color in zip(bars, colors):
                bar.set_color(color)
            
            ax.set_title(title, fontweight='bold')
            ax.set_ylabel('Score')
            ax.tick_params(axis='x', rotation=45)
            
            # Add value labels on bars
            for i, v in enumerate(values):
                ax.text(i, v + max(values) * 0.01, f'{v:.3f}', ha='center', va='bottom', fontsize=9)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"📊 Charts saved to: {save_path}")
        
        plt.show()


# Example test cases for evaluation
def create_sample_test_cases() -> List[TestCase]:
    """Create sample test cases for evaluation"""
    return [
        TestCase(
            question="What is machine learning?",
            ground_truth_answer="Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task.",
            relevant_documents=[
                "Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.",
                "Machine learning algorithms build mathematical models based on training data to make predictions or decisions."
            ],
            difficulty="easy",
            category="definitions"
        ),
        TestCase(
            question="How do neural networks process information?",
            ground_truth_answer="Neural networks process information by passing data through layers of interconnected nodes (neurons) that apply mathematical transformations, with each layer learning to recognize different patterns or features in the data.",
            relevant_documents=[
                "Neural networks are computational models inspired by biological neural networks in animal brains.",
                "Neural networks consist of layers of interconnected nodes that process information through weighted connections."
            ],
            difficulty="medium",
            category="technical"
        ),
        TestCase(
            question="What are the advantages and disadvantages of deep learning compared to traditional machine learning?",
            ground_truth_answer="Deep learning advantages include automatic feature extraction, superior performance on complex tasks like image recognition, and ability to handle large datasets. Disadvantages include requiring more computational resources, needing larger datasets, and being less interpretable than traditional methods.",
            relevant_documents=[
                "Deep learning uses artificial neural networks with multiple layers to model complex patterns in data.",
                "Traditional machine learning often requires manual feature engineering, while deep learning automates this process.",
                "Deep learning models require significant computational resources and large amounts of training data."
            ],
            difficulty="hard",
            category="comparison"
        ),
    ]


# Example usage
async def demo_evaluation_framework():
    """Demonstrate the evaluation framework"""
    from advanced_rag_transformer import AdvancedRAGQueryTransformer, QueryTransformationConfig
    import os
    
    # Initialize RAG system
    config = QueryTransformationConfig(
        use_multi_query=True,
        use_rag_fusion=True,
        use_decomposition=False,  # Disable some for faster testing
        use_step_back=False,
        use_hyde=True
    )
    
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ Please set GROQ_API_KEY environment variable")
        return
    
    rag_system = AdvancedRAGQueryTransformer(
        groq_api_key=groq_api_key,
        config=config
    )
    
    # Load test documents
    test_documents = [
        "Machine learning is a subset of artificial intelligence that enables computers to learn without being explicitly programmed.",
        "Neural networks are computational models inspired by biological neural networks in animal brains.",
        "Deep learning uses artificial neural networks with multiple layers to model complex patterns in data.",
        "Traditional machine learning often requires manual feature engineering and domain expertise.",
        "Deep learning models can automatically learn hierarchical representations from raw data.",
        "Transfer learning allows models to leverage knowledge from pre-trained networks.",
        "Overfitting occurs when models memorize training data rather than learning generalizable patterns."
    ]
    
    rag_system.load_documents(documents=test_documents)
    
    # Create evaluation framework
    evaluator = RAGEvaluationFramework(use_semantic_similarity=True)
    
    # Create test cases
    test_cases = create_sample_test_cases()
    
    # Evaluate different techniques
    techniques = ["basic", "multi_query", "rag_fusion", "hyde", "comprehensive"]
    
    print("🚀 Starting comprehensive evaluation...")
    results = await evaluator.evaluate_technique_comparison(rag_system, test_cases, techniques)
    
    # Generate report
    print("\n📋 Generating evaluation report...")
    report = evaluator.generate_evaluation_report("advanced_rag_evaluation_report.txt")
    
    print("\n" + "="*80)
    print("EVALUATION REPORT PREVIEW:")
    print("="*80)
    print(report[:2000] + "..." if len(report) > 2000 else report)
    
    # Create visualization
    try:
        evaluator.plot_comparison_charts("rag_technique_comparison.png")
    except Exception as e:
        print(f"Plotting error: {e}")
    
    print("\n✅ Evaluation completed!")
    return results


if __name__ == "__main__":
    asyncio.run(demo_evaluation_framework())