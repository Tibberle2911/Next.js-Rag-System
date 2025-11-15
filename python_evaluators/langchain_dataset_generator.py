"""
LangChain Dataset Generator
Generates test datasets and provides feedback using LangChain framework
Following: https://medium.com/@pdashok2875/implementation-and-evaluation-of-rag-using-langchain-and-ragas-d29c6ffc5442
"""
import os
import json
import sys
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_core.prompts import PromptTemplate
import google.generativeai as genai

class LangChainDatasetGenerator:
    """Generates test datasets and provides comprehensive feedback"""
    
    def __init__(self):
        """
        Initialize LangChain with Gemini model rotation
        Rotates through 4 models to avoid rate limits
        """
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        # Define 4 models for rotation
        self.models = [
            "gemini-2.0-flash-lite",
            "gemini-2.0-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash"
        ]
        
        self.current_model_index = 0
        genai.configure(api_key=self.gemini_api_key)
    
    def _get_next_model(self) -> str:
        """Get next model in rotation"""
        model = self.models[self.current_model_index]
        self.current_model_index = (self.current_model_index + 1) % len(self.models)
        return model
    
    def _call_gemini_sync(self, prompt: str, model_name: str = None) -> str:
        """Call Gemini API synchronously with specified or next available model"""
        if model_name is None:
            model_name = self._get_next_model()
            
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2048
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"Gemini API error with {model_name}: {str(e)}", file=sys.stderr)
            raise

    def generate_ground_truth(
        self, 
        question: str, 
        contexts: List[str]
    ) -> str:
        """
        Generate ground truth answer from contexts
        This creates a reference answer for evaluation
        """
        prompt_template = PromptTemplate(
            input_variables=["question", "context"],
            template="""Based on the following context, provide a comprehensive and accurate answer to the question.

Context:
{context}

Question: {question}

Provide a detailed, factual answer based solely on the information in the context:"""
        )
        
        try:
            context_text = "\n\n".join(contexts)
            prompt = prompt_template.format(question=question, context=context_text)
            response = self._call_gemini_sync(prompt)
            
            return response
            
        except Exception as e:
            print(f"Error generating ground truth: {str(e)}", file=sys.stderr)
            return "Ground truth generation failed"

    def generate_test_questions(
        self, 
        contexts: List[str],
        num_questions: int = 3
    ) -> List[str]:
        """
        Generate diverse test questions from contexts
        Useful for comprehensive RAG evaluation
        """
        prompt_template = PromptTemplate(
            input_variables=["context", "num_questions"],
            template="""Based on the following context, generate {num_questions} diverse and meaningful questions that can be answered using this context.

Context:
{context}

Generate {num_questions} questions (one per line):"""
        )
        
        try:
            context_text = "\n\n".join(contexts)
            prompt = prompt_template.format(context=context_text, num_questions=num_questions)
            response = self._call_gemini_sync(prompt)
            
            questions = [q.strip() for q in response.split('\n') if q.strip()]
            return questions[:num_questions]
            
        except Exception as e:
            print(f"Error generating test questions: {str(e)}", file=sys.stderr)
            return []

    def generate_comprehensive_feedback(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        ragas_scores: Dict[str, float],
        rag_mode: str = 'basic'
    ) -> Dict[str, Any]:
        """
        Generate comprehensive feedback based on RAGAS evaluation results
        This provides actionable insights for improvement
        """
        # Create a detailed analysis prompt for HUMAN-READABLE feedback
        prompt_template = PromptTemplate(
            input_variables=["question", "answer", "contexts", "scores", "mode"],
            template="""You are an expert RAG system evaluator. Analyze the following RAG system output and provide comprehensive, human-readable feedback.

RAG Mode: {mode}

Question: {question}

Generated Answer: {answer}

Retrieved Contexts:
{contexts}

RAGAS Evaluation Scores:
{scores}

IMPORTANT: Provide your analysis as a JSON object with PLAIN TEXT values (not nested objects or arrays). Write each section as clear, natural, human-readable paragraphs.

Provide:
1. overall_assessment: A 2-3 sentence summary of the overall performance
2. strengths: A paragraph describing what the system did well (write as flowing text, not bullet points or JSON)
3. weaknesses: A paragraph identifying areas that need improvement (write as flowing text, not bullet points or JSON)
4. recommendations: A paragraph with 2-3 actionable suggestions for improvement (write as flowing text, not bullet points or JSON)
5. context_analysis: A paragraph analyzing how well the retrieved contexts support the answer (write as flowing text, not bullet points or JSON)

Format as JSON with string values only - NO nested objects, NO arrays, NO structured data within the strings. Write naturally as if explaining to a human reader."""
        )
        
        try:
            contexts_text = "\n\n".join([f"Context {i+1}: {ctx}" for i, ctx in enumerate(contexts)])
            scores_text = "\n".join([f"- {metric}: {score:.3f}" for metric, score in ragas_scores.items()])
            
            prompt = prompt_template.format(
                question=question,
                answer=answer,
                contexts=contexts_text,
                scores=scores_text,
                mode=rag_mode.upper()
            )
            
            response = self._call_gemini_sync(prompt)
            content = response
            
            # Try to parse as JSON
            try:
                # Remove markdown code blocks if present
                if '```json' in content:
                    content = content.split('```json')[1].split('```')[0].strip()
                elif '```' in content:
                    content = content.split('```')[1].split('```')[0].strip()
                
                feedback = json.loads(content)
                
                # Ensure all values are strings (convert any nested objects/arrays to readable text)
                for key in ['overall_assessment', 'strengths', 'weaknesses', 'recommendations', 'context_analysis']:
                    if key in feedback:
                        value = feedback[key]
                        if isinstance(value, dict):
                            # Convert dict to readable text
                            feedback[key] = ". ".join([f"{k}: {v}" for k, v in value.items()])
                        elif isinstance(value, list):
                            # Convert list to readable text
                            feedback[key] = ". ".join([str(item) if isinstance(item, str) else json.dumps(item) for item in value])
                        elif not isinstance(value, str):
                            # Convert any other type to string
                            feedback[key] = str(value)
                
                return feedback
                
            except json.JSONDecodeError:
                # Fallback: structure the text response
                return {
                    "overall_assessment": "Evaluation completed successfully",
                    "strengths": "System provided relevant response based on retrieved contexts",
                    "weaknesses": content[:500] if len(content) > 500 else content,
                    "recommendations": "Continue monitoring RAGAS metrics for improvements",
                    "context_analysis": f"Retrieved {len(contexts)} context(s) for evaluation"
                }
                
        except Exception as e:
            print(f"Error generating feedback: {str(e)}", file=sys.stderr)
            return {
                "overall_assessment": f"RAG Mode: {rag_mode.upper()}",
                "strengths": "System operational",
                "weaknesses": "Unable to generate detailed feedback",
                "recommendations": "Monitor system performance",
                "context_analysis": f"Contexts retrieved: {len(contexts)}"
            }

def main():
    """Main function to handle command line operations"""
    if len(sys.argv) < 3:
        print("Usage: python langchain_dataset_generator.py <operation> <json_input>")
        print("Operations: generate_ground_truth, generate_questions, generate_feedback")
        sys.exit(1)
    
    try:
        operation = sys.argv[1]
        input_data = json.loads(sys.argv[2])
        
        generator = LangChainDatasetGenerator()
        
        if operation == "generate_ground_truth":
            question = input_data.get('question', '')
            contexts = input_data.get('contexts', [])
            
            ground_truth = generator.generate_ground_truth(question, contexts)
            result = {"ground_truth": ground_truth}
            
        elif operation == "generate_questions":
            contexts = input_data.get('contexts', [])
            num_questions = input_data.get('num_questions', 3)
            
            questions = generator.generate_test_questions(contexts, num_questions)
            result = {"questions": questions}
            
        elif operation == "generate_feedback":
            question = input_data.get('question', '')
            answer = input_data.get('answer', '')
            contexts = input_data.get('contexts', [])
            ragas_scores = input_data.get('ragas_scores', {})
            rag_mode = input_data.get('rag_mode', 'basic')
            
            feedback = generator.generate_comprehensive_feedback(
                question, answer, contexts, ragas_scores, rag_mode
            )
            result = {"feedback": feedback}
            
        else:
            result = {"error": f"Unknown operation: {operation}"}
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "fallback": "Operation failed"
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
