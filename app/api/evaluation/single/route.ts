import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface TestCase {
  id: string
  question: string
  category: string
  difficulty: string
  description: string
}

interface SingleEvaluationRequest {
  testCase: TestCase
  ragMode: 'basic' | 'advanced'
}

export async function POST(request: NextRequest) {
  try {
    const { testCase, ragMode }: SingleEvaluationRequest = await request.json()

    if (!testCase || !ragMode) {
      return NextResponse.json({ 
        error: 'Missing required parameters: testCase and ragMode' 
      }, { status: 400 })
    }

    // Set up the Python script path
    const evaluationDir = path.join(process.cwd(), 'evaluation')
    const scriptPath = path.join(evaluationDir, 'single_evaluator.py')

    // Prepare environment variables (match batch evaluator exactly)
    const env = {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      UPSTASH_VECTOR_REST_URL: process.env.UPSTASH_VECTOR_REST_URL,
      UPSTASH_VECTOR_REST_TOKEN: process.env.UPSTASH_VECTOR_REST_TOKEN,
      UPSTASH_VECTOR_REST_READONLY_TOKEN: process.env.UPSTASH_VECTOR_REST_READONLY_TOKEN,
      PYTHONPATH: evaluationDir,
      PYTHONIOENCODING: 'utf-8'
    }

    return new Promise<NextResponse>((resolve, reject) => {
      // Spawn Python process with test case and RAG mode
      const pythonProcess = spawn('python', [
        scriptPath, 
        JSON.stringify(testCase),
        ragMode
      ], {
        env,
        cwd: evaluationDir
      })

      let stdout = ''
      let stderr = ''
      let result: any = null
      let errorOccurred = false

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString()
        stdout += output
        
        // Look for result data in the output (consistent with batch evaluator)
        const lines = output.split('\n').filter((line: string) => line.trim())
        for (const line of lines) {
          console.log('Python output line:', line) // Add debugging like batch evaluator
          
          if (line.startsWith('RESULT:')) {
            try {
              result = JSON.parse(line.substring(7))
            } catch (parseError) {
              console.error('Failed to parse result:', line, parseError)
            }
          } else if (line.startsWith('ERROR:')) {
            console.error('Python evaluation error:', line.substring(6))
            errorOccurred = true
          } else if (line.startsWith('SUCCESS:')) {
            console.log('Evaluation completed:', line.substring(8))
          }
        }
      })

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString()
        stderr += error
        console.error('Python stderr:', error)
      })

      pythonProcess.on('close', (code) => {
        if (code !== 0 || errorOccurred) {
          console.error('Python process failed:', { code, stdout, stderr })
          resolve(NextResponse.json({ 
            error: 'Evaluation failed',
            details: stderr || 'Unknown error'
          }, { status: 500 }))
        } else if (result) {
          resolve(NextResponse.json(result))
        } else {
          resolve(NextResponse.json({ 
            error: 'No result returned from evaluation'
          }, { status: 500 }))
        }
      })

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error)
        resolve(NextResponse.json({ 
          error: 'Failed to start evaluation process',
          details: error.message
        }, { status: 500 }))
      })

      // Set a timeout for the evaluation (match batch evaluator timing)
      const timeoutDuration = ragMode === 'advanced' ? 180000 : 120000 // 3min for advanced, 2min for basic
      setTimeout(() => {
        if (!pythonProcess.killed) {
          pythonProcess.kill()
          resolve(NextResponse.json({ 
            error: 'Evaluation timeout'
          }, { status: 408 }))
        }
      }, timeoutDuration)
    })

  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}