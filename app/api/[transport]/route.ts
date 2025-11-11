// app/api/[transport]/route.ts - Digital Twin RAG MCP Server
import { executeRAGQuery, basicRagTool, advancedRagTool, ragQueryTool } from "@/lib/mcp-rag-tools";

// Simple MCP-like JSON-RPC handler
async function handleMcpRequest(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    
    // Handle tools/list request
    if (body.method === 'tools/list') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: basicRagTool.name,
              description: basicRagTool.description,
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The question or query to search for in the knowledge base"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: advancedRagTool.name,
              description: advancedRagTool.description,
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The question or query to search for using advanced RAG techniques"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: ragQueryTool.name,
              description: ragQueryTool.description,
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The question or query to search for in the knowledge base"
                  },
                  mode: {
                    type: "string",
                    enum: ["basic", "advanced"],
                    description: "RAG mode to use",
                    default: "basic"
                  }
                },
                required: ["query"]
              }
            }
          ]
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Handle tools/call request
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      
      try {
        let result;
        
        switch (name) {
          case basicRagTool.name: {
            const { query } = args as { query: string };
            result = await executeRAGQuery({ query, mode: 'basic' });
            break;
          }
          
          case advancedRagTool.name: {
            const { query } = args as { query: string };
            result = await executeRAGQuery({ query, mode: 'advanced' });
            break;
          }
          
          case ragQueryTool.name: {
            const { query, mode = 'basic' } = args as { query: string; mode?: 'basic' | 'advanced' };
            result = await executeRAGQuery({ query, mode });
            break;
          }
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [
              {
                type: "text",
                text: result.text
              }
            ]
          }
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          error: { 
            code: -32603, 
            message: 'Tool execution failed',
            data: error instanceof Error ? error.message : 'Unknown error'
          }
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32601, message: 'Method not found' }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { 
        code: -32700, 
        message: 'Parse error',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export { handleMcpRequest as GET, handleMcpRequest as POST };