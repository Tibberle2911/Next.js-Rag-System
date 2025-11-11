// app/api/mcp/route.ts - Digital Twin RAG MCP Server
import { executeRAGQuery, basicRagTool, advancedRagTool, ragQueryTool } from "@/lib/mcp-rag-tools";

// Handle initial MCP handshake and protocol
async function handleMcpRequest(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Handle GET request for SSE (Server-Sent Events) - MCP protocol requirement
  if (request.method === 'GET') {
    // Return a proper SSE response for MCP protocol compatibility
    return new Response(
      'data: {"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n\n',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    console.log('MCP Request:', body.method, body);
    
    // Handle MCP initialization
    if (body.method === 'initialize') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'digital-twin-rag-server',
            version: '1.0.0'
          }
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Handle initialized notification
    if (body.method === 'notifications/initialized') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {}
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
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
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Handle tools/call request
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      
      try {
        let result;
        
        console.log(`MCP Tool Call: ${name} with args:`, args);
        
        switch (name) {
          case basicRagTool.name: {
            const { query } = args as { query: string };
            console.log(`Executing basic RAG query: ${query}`);
            result = await executeRAGQuery({ query, mode: 'basic' });
            break;
          }
          
          case advancedRagTool.name: {
            const { query } = args as { query: string };
            console.log(`Executing advanced RAG query: ${query}`);
            result = await executeRAGQuery({ query, mode: 'advanced' });
            break;
          }
          
          case ragQueryTool.name: {
            const { query, mode = 'basic' } = args as { query: string; mode?: 'basic' | 'advanced' };
            console.log(`Executing RAG query with mode ${mode}: ${query}`);
            result = await executeRAGQuery({ query, mode });
            break;
          }
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        console.log(`RAG query result:`, result);
        
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
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        console.error('MCP Tool execution error:', error);
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
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32601, message: 'Method not found' }
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('MCP Request error:', error);
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
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export { handleMcpRequest as GET, handleMcpRequest as POST };