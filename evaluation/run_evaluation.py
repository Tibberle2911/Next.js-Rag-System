#!/usr/bin/env python3
"""
RAG System Comprehensive Evaluation Runner
Orchestrates all evaluation frameworks: RAGAS, Spotlight, and LangChain
"""

import asyncio
import os
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any
import json
import pandas as pd
from datetime import datetime

# Add evaluation modules to path
sys.path.append(str(Path(__file__).parent))

# Import our evaluation modules
available_modules = {}

try:
    from rag_evaluator import RAGEvaluator, RAGVisualizationSuite
    available_modules['rag'] = True
    print("✅ RAGAS evaluation module loaded")
except ImportError as e:
    available_modules['rag'] = False
    print(f"⚠️ RAGAS evaluation module not available: {e}")
    # Create dummy classes to prevent import errors
    class RAGEvaluator:
        def __init__(self, *args, **kwargs):
            pass
    class RAGVisualizationSuite:
        def __init__(self, *args, **kwargs):
            pass

# Spotlight analyzer functionality removed - keeping dummy class for compatibility
class SpotlightRAGAnalyzer:
    def __init__(self, *args, **kwargs):
        pass
    def launch_spotlight_analysis(self):
        print("⚠️ Spotlight analysis functionality has been removed")
        print("💡 Use the generated visualizations and reports instead")
available_modules['spotlight'] = False
print("⚠️ Spotlight analysis module disabled")

try:
    from langchain_evaluator import LangChainRAGEvaluator
    available_modules['langchain'] = True
    print("✅ LangChain evaluation module loaded")
except ImportError as e:
    available_modules['langchain'] = False
    print(f"⚠️ LangChain evaluation module not available: {e}")
    # Create dummy class to prevent import errors
    class LangChainRAGEvaluator:
        def __init__(self, *args, **kwargs):
            pass

if not any(available_modules.values()):
    print("❌ No evaluation modules could be loaded!")
    print("📋 Please ensure dependencies are installed or use basic evaluation")
    sys.exit(1)
else:
    print(f"📊 Available evaluation frameworks: {[k for k, v in available_modules.items() if v]}")

class ComprehensiveRAGEvaluationSuite:
    """Orchestrates all RAG evaluation frameworks"""
    
    def __init__(self, groq_api_key: str, rag_endpoint: str = "http://localhost:3000/api/chat"):
        self.groq_api_key = groq_api_key
        self.rag_endpoint = rag_endpoint
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Initialize evaluators based on availability
        self.ragas_evaluator = None
        self.langchain_evaluator = None
        
        if available_modules.get('rag', False):
            self.ragas_evaluator = RAGEvaluator(groq_api_key)
        
        if available_modules.get('langchain', False):
            self.langchain_evaluator = LangChainRAGEvaluator(groq_api_key, rag_endpoint)
        
        # Results storage
        self.results = {
            "metadata": {
                "timestamp": self.timestamp,
                "groq_api_key_present": bool(groq_api_key),
                "rag_endpoint": rag_endpoint,
                "available_modules": available_modules
            },
            "ragas_results": None,
            "langchain_results": None,
            "combined_analysis": {}
        }
    
    async def run_ragas_evaluation(self) -> pd.DataFrame:
        """Run RAGAS-based evaluation"""
        print("\\n🔬 Running RAGAS Evaluation...")
        print("=" * 40)
        
        if not self.ragas_evaluator:
            print("❌ RAGAS evaluator not initialized")
            return None
        
        try:
            ragas_df = await self.ragas_evaluator.run_comprehensive_evaluation()
            self.results["ragas_results"] = ragas_df.to_dict('records')
            
            print(f"✅ RAGAS evaluation completed: {len(ragas_df)} test cases")
            return ragas_df
            
        except Exception as e:
            print(f"❌ RAGAS evaluation failed: {e}")
            return None
    
    async def run_langchain_evaluation(self) -> List[Any]:
        """Run LangChain-based evaluation"""
        print("\\n🔗 Running LangChain Evaluation...")
        print("=" * 40)
        
        if not self.langchain_evaluator:
            print("❌ LangChain evaluator not initialized")
            return None
        
        try:
            langchain_results = await self.langchain_evaluator.run_comprehensive_evaluation()
            self.results["langchain_results"] = [
                {
                    "question": e.question,
                    "prediction": e.prediction,
                    "reference": e.reference,
                    "criteria_scores": e.criteria_scores,
                    "overall_score": e.overall_score,
                    "evaluation_time": e.evaluation_time
                }
                for e in langchain_results
            ]
            
            print(f"✅ LangChain evaluation completed: {len(langchain_results)} evaluations")
            return langchain_results
            
        except Exception as e:
            print(f"❌ LangChain evaluation failed: {e}")
            return None
    
    def create_combined_analysis(self, ragas_df: pd.DataFrame = None, langchain_results: List[Any] = None):
        """Create combined analysis from all evaluation results"""
        
        analysis = {
            "summary": {},
            "recommendations": [],
            "metrics_comparison": {},
            "performance_insights": []
        }
        
        # RAGAS Analysis
        if ragas_df is not None and len(ragas_df) > 0:
            analysis["summary"]["ragas"] = {
                "total_cases": len(ragas_df),
                "avg_overall_score": ragas_df['overall_score'].mean(),
                "avg_response_time": ragas_df['response_time'].mean(),
                "best_category": ragas_df.groupby('category')['overall_score'].mean().idxmax(),
                "worst_category": ragas_df.groupby('category')['overall_score'].mean().idxmin()
            }
            
            # RAGAS specific metrics
            ragas_metrics = ['faithfulness', 'answer_relevancy', 'context_precision', 'context_recall']
            for metric in ragas_metrics:
                if metric in ragas_df.columns:
                    analysis["metrics_comparison"][f"ragas_{metric}"] = ragas_df[metric].mean()
        
        # LangChain Analysis
        if langchain_results is not None and len(langchain_results) > 0:
            analysis["summary"]["langchain"] = {
                "total_evaluations": len(langchain_results),
                "avg_overall_score": sum(e.overall_score for e in langchain_results) / len(langchain_results),
                "avg_evaluation_time": sum(e.evaluation_time for e in langchain_results) / len(langchain_results)
            }
            
            # LangChain specific criteria
            all_criteria = set()
            for e in langchain_results:
                all_criteria.update(e.criteria_scores.keys())
            
            for criterion in all_criteria:
                scores = [e.criteria_scores.get(criterion, 0) for e in langchain_results]
                analysis["metrics_comparison"][f"langchain_{criterion}"] = sum(scores) / len(scores)
        
        # Generate recommendations
        analysis["recommendations"] = self.generate_recommendations(analysis["metrics_comparison"])
        
        # Performance insights
        analysis["performance_insights"] = self.generate_performance_insights(ragas_df, langchain_results)
        
        self.results["combined_analysis"] = analysis
        return analysis
    
    def generate_recommendations(self, metrics: Dict[str, float]) -> List[str]:
        """Generate actionable recommendations based on metrics"""
        
        recommendations = []
        
        # Check RAGAS metrics
        if "ragas_faithfulness" in metrics:
            if metrics["ragas_faithfulness"] < 0.7:
                recommendations.append("🔧 Improve faithfulness: Enhance context grounding and reduce hallucinations")
        
        if "ragas_answer_relevancy" in metrics:
            if metrics["ragas_answer_relevancy"] < 0.7:
                recommendations.append("🎯 Improve answer relevancy: Better align responses with user questions")
        
        if "ragas_context_precision" in metrics:
            if metrics["ragas_context_precision"] < 0.7:
                recommendations.append("🔍 Improve context precision: Enhance retrieval ranking and filtering")
        
        if "ragas_context_recall" in metrics:
            if metrics["ragas_context_recall"] < 0.7:
                recommendations.append("📚 Improve context recall: Expand knowledge base coverage")
        
        # Check LangChain metrics
        if "langchain_relevance" in metrics:
            if metrics["langchain_relevance"] < 0.7:
                recommendations.append("📈 Improve response relevance: Enhance question understanding")
        
        if "langchain_coherence" in metrics:
            if metrics["langchain_coherence"] < 0.7:
                recommendations.append("🔗 Improve coherence: Better structure and flow in responses")
        
        if "langchain_factual_accuracy" in metrics:
            if metrics["langchain_factual_accuracy"] < 0.8:
                recommendations.append("✅ Improve factual accuracy: Strengthen fact verification")
        
        # General recommendations
        recommendations.extend([
            "📊 Monitor performance metrics regularly with automated evaluation",
            "🔄 Implement continuous improvement based on user feedback",
            "🧪 A/B test different prompting strategies",
            "📝 Expand training data for underperforming categories"
        ])
        
        return recommendations
    
    def generate_performance_insights(self, ragas_df: pd.DataFrame = None, langchain_results: List[Any] = None) -> List[str]:
        """Generate performance insights from evaluation data"""
        
        insights = []
        
        if ragas_df is not None and len(ragas_df) > 0:
            # Response time insights
            avg_time = ragas_df['response_time'].mean()
            if avg_time > 3:
                insights.append(f"⚠️ High response time: {avg_time:.2f}s average - consider caching or optimization")
            elif avg_time < 1:
                insights.append(f"🚀 Excellent response time: {avg_time:.2f}s average")
            
            # Category performance insights
            category_performance = ragas_df.groupby('category')['overall_score'].mean()
            best_category = category_performance.idxmax()
            worst_category = category_performance.idxmin()
            
            insights.append(f"🏆 Best performing category: {best_category} ({category_performance[best_category]:.3f})")
            insights.append(f"📉 Needs improvement: {worst_category} ({category_performance[worst_category]:.3f})")
        
        if langchain_results is not None and len(langchain_results) > 0:
            # Evaluation time insights
            eval_times = [e.evaluation_time for e in langchain_results]
            avg_eval_time = sum(eval_times) / len(eval_times)
            insights.append(f"⏱️ Average evaluation time: {avg_eval_time:.2f}s per response")
            
            # Quality insights
            overall_scores = [e.overall_score for e in langchain_results]
            high_quality_count = sum(1 for score in overall_scores if score >= 0.8)
            insights.append(f"🎯 High quality responses: {high_quality_count}/{len(overall_scores)} ({high_quality_count/len(overall_scores)*100:.1f}%)")
        
        return insights
    
    def _convert_to_json_safe(self, obj):
        """Convert nested dictionaries with tuple keys to JSON-safe format"""
        if isinstance(obj, dict):
            return {str(k): self._convert_to_json_safe(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_json_safe(item) for item in obj]
        elif isinstance(obj, tuple):
            return list(obj)
        else:
            return obj
    
    def save_comprehensive_results(self, output_dir: str = "evaluation_results"):
        """Save all evaluation results and analysis"""
        
        # Create output directory
        Path(output_dir).mkdir(exist_ok=True)
        
        # Save comprehensive results with JSON-safe conversion
        results_file = f"{output_dir}/comprehensive_evaluation_{self.timestamp}.json"
        
        # Convert tuple keys to strings for JSON serialization
        json_safe_results = self._convert_to_json_safe(self.results)
        
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(json_safe_results, f, indent=2, default=str)
        
        # Save analysis report
        report_file = f"{output_dir}/evaluation_report_{self.timestamp}.md"
        self.create_markdown_report(report_file)
        
        print(f"\\n📁 Results saved to:")
        print(f"   📊 Comprehensive data: {results_file}")
        print(f"   📝 Analysis report: {report_file}")
        
        return results_file, report_file
    
    def create_markdown_report(self, filename: str):
        """Create comprehensive markdown report"""
        
        analysis = self.results["combined_analysis"]
        
        report = f"""# RAG System Comprehensive Evaluation Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

### RAGAS Evaluation
"""
        
        if analysis.get("summary", {}).get("ragas"):
            ragas_summary = analysis["summary"]["ragas"]
            report += f"""- **Total Test Cases**: {ragas_summary['total_cases']}
- **Average Overall Score**: {ragas_summary['avg_overall_score']:.3f}
- **Average Response Time**: {ragas_summary['avg_response_time']:.3f}s
- **Best Performing Category**: {ragas_summary['best_category']}
- **Needs Improvement**: {ragas_summary['worst_category']}
"""
        
        report += f"""
### LangChain Evaluation
"""
        
        if analysis.get("summary", {}).get("langchain"):
            lc_summary = analysis["summary"]["langchain"]
            report += f"""- **Total Evaluations**: {lc_summary['total_evaluations']}
- **Average Overall Score**: {lc_summary['avg_overall_score']:.3f}
- **Average Evaluation Time**: {lc_summary['avg_evaluation_time']:.3f}s
"""
        
        report += f"""
## Detailed Metrics Comparison

"""
        
        if analysis.get("metrics_comparison"):
            for metric, score in analysis["metrics_comparison"].items():
                report += f"- **{metric}**: {score:.3f}\\n"
        
        report += f"""
## Recommendations

"""
        
        if analysis.get("recommendations"):
            for rec in analysis["recommendations"]:
                report += f"- {rec}\\n"
        
        report += f"""
## Performance Insights

"""
        
        if analysis.get("performance_insights"):
            for insight in analysis["performance_insights"]:
                report += f"- {insight}\\n"
        
        report += f"""
## Next Steps

1. **Immediate Actions**: Address the top 3 recommendations
2. **Short-term**: Implement monitoring for key metrics
3. **Long-term**: Develop automated evaluation pipeline
4. **Continuous**: Regular evaluation and improvement cycles

---
*Generated by Comprehensive RAG Evaluation Suite*
"""
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report)

async def main():
    """Main evaluation orchestrator"""
    
    parser = argparse.ArgumentParser(description="Comprehensive RAG System Evaluation")
    parser.add_argument("--skip-ragas", action="store_true", help="Skip RAGAS evaluation")
    parser.add_argument("--skip-langchain", action="store_true", help="Skip LangChain evaluation")
    parser.add_argument("--skip-spotlight", action="store_true", help="Skip Spotlight analysis")
    parser.add_argument("--rag-endpoint", default="http://localhost:3000/api/chat", help="RAG system endpoint")
    parser.add_argument("--output-dir", default="evaluation_results", help="Output directory")
    
    args = parser.parse_args()
    
    # Check for GROQ API key
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("❌ GROQ_API_KEY not found in environment variables")
        print("💡 Please set your GROQ API key: export GROQ_API_KEY=your_key_here")
        return
    
    print("🚀 RAG System Comprehensive Evaluation Suite")
    print("=" * 60)
    print(f"🎯 Target RAG endpoint: {args.rag_endpoint}")
    print(f"📁 Output directory: {args.output_dir}")
    
    # Initialize evaluation suite
    evaluation_suite = ComprehensiveRAGEvaluationSuite(groq_api_key, args.rag_endpoint)
    
    # Run evaluations
    ragas_results = None
    langchain_results = None
    
    if not args.skip_ragas and available_modules.get('rag', False):
        ragas_results = await evaluation_suite.run_ragas_evaluation()
    elif not available_modules.get('rag', False):
        print("⚠️ Skipping RAGAS evaluation - module not available")
    
    if not args.skip_langchain and available_modules.get('langchain', False):
        langchain_results = await evaluation_suite.run_langchain_evaluation()
    elif not available_modules.get('langchain', False):
        print("⚠️ Skipping LangChain evaluation - module not available")
    
    # Create combined analysis
    print("\n📊 Creating Combined Analysis...")
    evaluation_suite.create_combined_analysis(ragas_results, langchain_results)
    
    # Create visualizations if RAGAS results are available
    if ragas_results is not None:
        print("\n📈 Creating Visualizations...")
        try:
            viz_suite = RAGVisualizationSuite(ragas_results)
            viz_suite.create_simplified_dashboard()
            viz_suite.create_detailed_analysis_report()
        except Exception as e:
            print(f"⚠️ Visualization creation failed: {e}")
            print("💡 Continuing without advanced visualizations...")
    
    # Save results
    evaluation_suite.save_comprehensive_results(args.output_dir)
    
    # Spotlight analysis has been removed - skip this section
    if not args.skip_spotlight:
        print("⚠️ Spotlight analysis has been permanently disabled")
        print("📊 Please use the generated dashboard and reports for analysis")
    
    # Final summary
    print("\\n🎉 Comprehensive Evaluation Complete!")
    print("📈 Check the output directory for detailed results and recommendations")

if __name__ == "__main__":
    asyncio.run(main())