#!/bin/bash
# Setup script for Python evaluation environment

echo "🐍 Setting up Python environment for authentic framework evaluation..."

# Create virtual environment
python -m venv python_evaluators/venv

# Activate virtual environment (Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source python_evaluators/venv/Scripts/activate
else
    source python_evaluators/venv/bin/activate
fi

# Upgrade pip
python -m pip install --upgrade pip

# Install requirements
echo "📦 Installing Python dependencies..."
pip install -r python_evaluators/requirements.txt

echo "✅ Python environment setup complete!"
echo ""
echo "To manually activate the environment:"
echo "Windows: python_evaluators\\venv\\Scripts\\activate"
echo "Linux/Mac: source python_evaluators/venv/bin/activate"
echo ""
echo "To test the evaluators:"
echo "cd python_evaluators"
echo "python ragas_evaluator.py '{\"question\":\"test\",\"answer\":\"test\",\"contexts\":[\"test\"]}'"
echo "python langchain_evaluator.py '{\"question\":\"test\",\"answer\":\"test\"}'"