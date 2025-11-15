import asyncio
import json
from langchain_evaluator import LangChainEvaluator

async def test_evaluator():
    with open('test_input.json', 'r') as f:
        input_data = json.load(f)
    
    evaluator = LangChainEvaluator()
    results = await evaluator.evaluate_all_metrics(
        question=input_data['question'],
        answer=input_data['answer'],
        context=input_data.get('context', ''),
        rag_mode=input_data.get('rag_mode', 'basic')
    )
    
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(test_evaluator())