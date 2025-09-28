/**
 * Example MCP Client for testing the eWeLink MCP Server
 * Demonstrates how to connect and interact with the MCP HTTP transport
 */

import axios from 'axios';

interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPClient {
  private baseUrl: string;
  private tenantId: string;
  private userId: string;
  private sessionId?: string;

  constructor(baseUrl: string, tenantId: string, userId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.tenantId = tenantId;
    this.userId = userId;
  }

  /**
   * Get server info (GET request)
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/mcp/${this.tenantId}/${this.userId}?action=server-info`,
        {
          headers: this.getHeaders()
        }
      );

      if (response.headers['mcp-session-id']) {
        this.sessionId = response.headers['mcp-session-id'];
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to get server info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Initialize MCP connection
   */
  async initialize(): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'eWeLink MCP Test Client',
          version: '1.0.0'
        }
      }
    };

    return await this.sendRequest(request);
  }

  /**
   * Send initialized notification
   */
  async sendInitialized(): Promise<void> {
    const notification: MCPRequest = {
      jsonrpc: '2.0',
      method: 'initialized'
    };

    await this.sendRequest(notification);
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    };

    return await this.sendRequest(request);
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    };

    return await this.sendRequest(request);
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list'
    };

    return await this.sendRequest(request);
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'prompts/list'
    };

    return await this.sendRequest(request);
  }

  /**
   * Send ping
   */
  async ping(): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: 'ping',
      method: 'ping'
    };

    return await this.sendRequest(request);
  }

  /**
   * Send MCP request
   */
  private async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/mcp/${this.tenantId}/${this.userId}`,
        request,
        {
          headers: this.getHeaders()
        }
      );

      // Update session ID if provided
      if (response.headers['mcp-session-id']) {
        this.sessionId = response.headers['mcp-session-id'];
      }

      return response.data;
    } catch (error: any) {
      console.error('MCP request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    return headers;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }
}

// Example usage
async function testMCPClient() {
  console.log('🧪 Testing eWeLink MCP Client...\n');

  // Replace with actual values
  const baseUrl = 'http://localhost:3000';
  const tenantId = 'your-tenant-id';
  const userId = 'your-user-id';

  const client = new MCPClient(baseUrl, tenantId, userId);

  try {
    // 1. Get server info
    console.log('1. Getting server info...');
    const serverInfo = await client.getServerInfo();
    console.log('Server Info:', JSON.stringify(serverInfo, null, 2));
    console.log('Session ID:', client.getSessionId());

    // 2. Initialize connection
    console.log('\n2. Initializing MCP connection...');
    const initResponse = await client.initialize();
    console.log('Initialize Response:', JSON.stringify(initResponse, null, 2));

    // 3. Send initialized notification
    console.log('\n3. Sending initialized notification...');
    await client.sendInitialized();
    console.log('Initialized notification sent');

    // 4. List tools
    console.log('\n4. Listing available tools...');
    const toolsResponse = await client.listTools();
    console.log('Tools:', JSON.stringify(toolsResponse, null, 2));

    // 5. List resources
    console.log('\n5. Listing available resources...');
    const resourcesResponse = await client.listResources();
    console.log('Resources:', JSON.stringify(resourcesResponse, null, 2));

    // 6. List prompts
    console.log('\n6. Listing available prompts...');
    const promptsResponse = await client.listPrompts();
    console.log('Prompts:', JSON.stringify(promptsResponse, null, 2));

    // 7. Test ping
    console.log('\n7. Testing ping...');
    const pingResponse = await client.ping();
    console.log('Ping Response:', JSON.stringify(pingResponse, null, 2));

    // 8. Call a tool (example: list_devices)
    console.log('\n8. Calling list_devices tool...');
    const devicesResponse = await client.callTool('list_devices', { online_only: false });
    console.log('Devices Response:', JSON.stringify(devicesResponse, null, 2));

    console.log('\n✅ MCP Client test completed successfully!');

  } catch (error: any) {
    console.error('\n❌ MCP Client test failed:', error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testMCPClient();
}

export { MCPClient, testMCPClient };
