import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

// Streaming response for real-time updates
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Parse request body to get category
  let category = ''
  try {
    const body = await request.json()
    category = body.category || ''
  } catch (error) {
    // If no body or invalid JSON, proceed without category
  }
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial status
      controller.enqueue(encoder.encode(JSON.stringify({
        type: 'progress',
        progress: 0,
        status: 'Starting evaluation process...'
      }) + '\n'))

      // Create Python process for evaluation with category parameter
      const evaluationScript = path.join(process.cwd(), 'evaluation', 'web_evaluator.py')
      const pythonArgs = [evaluationScript]
      if (category) {
        pythonArgs.push(category)
      }
      
      const pythonProcess = spawn('python', pythonArgs, {
        cwd: path.join(process.cwd(), 'evaluation'),
        env: { ...process.env }
      })

      let progressCount = 0
      const totalSteps = 10 // 5 test cases * 2 runs each

      pythonProcess.stdout?.on('data', (data) => {
        const output = data.toString()
        const lines = output.split('\n').filter((line: string) => line.trim())
        
        for (const line of lines) {
          console.log('Python output line:', line) // Add debugging
          
          try {
            if (line.startsWith('PROGRESS:')) {
              const progressData = JSON.parse(line.replace('PROGRESS:', ''))
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'progress',
                progress: progressData.progress,
                status: progressData.status
              }) + '\n'))
            } else if (line.startsWith('RESULT:')) {
              const resultData = JSON.parse(line.replace('RESULT:', ''))
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'result',
                result: resultData
              }) + '\n'))
              
              progressCount++
              const progress = Math.min((progressCount / totalSteps) * 100, 95)
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'progress',
                progress: progress,
                status: `Evaluated ${progressCount}/${totalSteps} test cases`
              }) + '\n'))
            } else if (line.startsWith('SUMMARY:')) {
              const summaryData = JSON.parse(line.replace('SUMMARY:', ''))
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'summary',
                summary: summaryData
              }) + '\n'))
            } else if (line.startsWith('ERROR:')) {
              const errorData = line.replace('ERROR:', '')
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'error',
                error: errorData
              }) + '\n'))
            } else if (line.startsWith('SUCCESS:')) {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'progress',
                progress: 100,
                status: 'Evaluation completed successfully!'
              }) + '\n'))
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON output
            console.log('Non-JSON output:', line)
          }
        }
      })

      pythonProcess.stderr?.on('data', (data) => {
        const error = data.toString()
        console.error('Python stderr:', error)
        
        // Send error to frontend if it looks like a proper error
        if (error.includes('Error') || error.includes('Exception') || error.includes('Traceback')) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: `Python Error: ${error}`
          }) + '\\n'))
        }
      })

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`)
        
        if (code === 0) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            progress: 100,
            status: 'Evaluation completed successfully!'
          }) + '\\n'))
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete'
          }) + '\\n'))
        } else {
          console.error(`Evaluation process failed with code ${code}`)
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: `Evaluation process completed with warnings or errors (exit code: ${code}). Check results above.`
          }) + '\\n'))
          // Still mark as complete so the frontend shows available results
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'complete'
          }) + '\\n'))
        }
        controller.close()
      })

      pythonProcess.on('error', (error) => {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          error: `Failed to start evaluation process: ${error.message}`
        }) + '\\n'))
        controller.close()
      })
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}