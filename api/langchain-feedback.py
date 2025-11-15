from http.server import BaseHTTPRequestHandler
import json
import sys
import os

try:
    from langchain_core.prompts import PromptTemplate
    import google.generativeai as genai
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    print(f"Warning: LangChain import failed: {e}", file=sys.stderr)
    LANGCHAIN_AVAILABLE = False

# Global model rotation tracker (persists across requests in same container)
_global_model_tracker = {
    'current_index': 0,
    'models': [
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash"
    ]
}

def get_next_model():
    """Get next model in round-robin rotation to avoid rate limits"""
    model = _global_model_tracker['models'][_global_model_tracker['current_index']]
    _global_model_tracker['current_index'] = (
        _global_model_tracker['current_index'] + 1
    ) % len(_global_model_tracker['models'])
    return model

def call_gemini_sync(prompt: str, model_name: str = None) -> str:
    """Call Gemini API synchronously with specified or next available model"""
    if model_name is None:
        model_name = get_next_model()
        
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

def generate_ground_truth(question: str, contexts: list) -> str:
    """Generate ground truth answer from contexts (matching langchain_dataset_generator.py)"""
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
        response = call_gemini_sync(prompt)
        
        return response
        
    except Exception as e:
        print(f"Error generating ground truth: {str(e)}", file=sys.stderr)
        return "Ground truth generation failed"

def generate_test_questions(contexts: list, num_questions: int = 3) -> list:
    """Generate diverse test questions from contexts (matching langchain_dataset_generator.py)"""
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
        response = call_gemini_sync(prompt)
        
        questions = [q.strip() for q in response.split('\n') if q.strip()]
        return questions[:num_questions]
        
    except Exception as e:
        print(f"Error generating test questions: {str(e)}", file=sys.stderr)
        return []

def generate_comprehensive_feedback(
    question: str,
    answer: str,
    contexts: list,
    ragas_scores: dict,
    rag_mode: str = 'basic'
) -> dict:
    """Generate comprehensive feedback (matching langchain_dataset_generator.py exactly)"""
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
        
        response = call_gemini_sync(prompt)
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

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Vercel serverless function handler for LangChain dataset generation and feedback"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            operation = data.get('operation', 'generate_feedback')
            
            if not LANGCHAIN_AVAILABLE:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                error_result = {
                    'error': 'LangChain not available',
                    'fallback': 'Operation failed'
                }
                self.wfile.write(json.dumps(error_result).encode())
                return
            
            # Initialize Gemini
            gemini_api_key = os.environ.get('GEMINI_API_KEY')
            if not gemini_api_key:
                raise ValueError('GEMINI_API_KEY environment variable not set')
            
            genai.configure(api_key=gemini_api_key)
            
            # Handle different operations
            if operation == "generate_ground_truth":
                question = data.get('question', '')
                contexts = data.get('contexts', [])
                
                ground_truth = generate_ground_truth(question, contexts)
                result = {"ground_truth": ground_truth}
                
            elif operation == "generate_questions":
                contexts = data.get('contexts', [])
                num_questions = data.get('num_questions', 3)
                
                questions = generate_test_questions(contexts, num_questions)
                result = {"questions": questions}
                
            elif operation == "generate_feedback":
                question = data.get('question', '')
                answer = data.get('answer', '')
                contexts = data.get('contexts', [])
                ragas_scores = data.get('ragas_scores', {})
                rag_mode = data.get('rag_mode', 'basic')
                
                feedback = generate_comprehensive_feedback(
                    question, answer, contexts, ragas_scores, rag_mode
                )
                result = {"feedback": feedback}
                
            else:
                result = {"error": f"Unknown operation: {operation}"}
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            # Error response
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            error_result = {
                "error": str(e),
                "fallback": "Operation failed"
            }
            
            self.wfile.write(json.dumps(error_result).encode())
    
    def do_GET(self):
        """Health check endpoint"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        health = {
            'status': 'ok',
            'langchain_available': LANGCHAIN_AVAILABLE,
            'service': 'langchain_dataset_generator',
            'operations': ['generate_ground_truth', 'generate_questions', 'generate_feedback']
        }
        
        self.wfile.write(json.dumps(health).encode())
