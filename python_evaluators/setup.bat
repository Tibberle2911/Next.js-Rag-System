@echo off
REM Windows setup script for Python evaluation environment

echo 🐍 Setting up Python environment for authentic framework evaluation...

REM Create virtual environment
python -m venv python_evaluators\venv

REM Activate virtual environment
call python_evaluators\venv\Scripts\activate

REM Upgrade pip
python -m pip install --upgrade pip

REM Install requirements
echo 📦 Installing Python dependencies...
pip install -r python_evaluators\requirements.txt

echo ✅ Python environment setup complete!
echo.
echo To manually activate the environment:
echo python_evaluators\venv\Scripts\activate
echo.
echo To test the evaluators:
echo cd python_evaluators
echo python ragas_evaluator.py "{\"question\":\"test\",\"answer\":\"test\",\"contexts\":[\"test\"]}"
echo python langchain_evaluator.py "{\"question\":\"test\",\"answer\":\"test\"}"

pause