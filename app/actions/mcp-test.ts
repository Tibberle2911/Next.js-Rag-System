import { basicRagQuery, advancedRagQuery, ragQueryWithMode, listRAGTools } from './mcp-actions'

// Test basic RAG query
export async function testBasicRAG() {
  console.log('Testing Basic RAG Query...')
  const result = await basicRagQuery('Tell me about your professional experience')
  console.log('Basic RAG Result:', JSON.stringify(result, null, 2))
  return result
}

// Test advanced RAG query
export async function testAdvancedRAG() {
  console.log('Testing Advanced RAG Query...')
  const result = await advancedRagQuery('What are your technical skills?')
  console.log('Advanced RAG Result:', JSON.stringify(result, null, 2))
  return result
}

// Test RAG query with mode selection
export async function testRAGWithMode() {
  console.log('Testing RAG Query with Mode Selection...')
  const result = await ragQueryWithMode({ 
    query: 'What projects have you worked on?', 
    mode: 'advanced' 
  })
  console.log('RAG with Mode Result:', JSON.stringify(result, null, 2))
  return result
}

// Test list tools
export async function testListTools() {
  console.log('Testing List RAG Tools...')
  const result = await listRAGTools()
  console.log('Available Tools:', JSON.stringify(result, null, 2))
  return result
}

// Run all tests
export async function runAllMCPTests() {
  console.log('=== Starting MCP Server Tests ===')
  
  try {
    await testListTools()
    await testBasicRAG()
    await testAdvancedRAG()
    await testRAGWithMode()
    
    console.log('=== All MCP Tests Completed Successfully ===')
  } catch (error) {
    console.error('MCP Test Error:', error)
  }
}