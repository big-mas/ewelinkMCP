import { 
  MCPRequest, 
  MCPResponse, 
  MCPError, 
  MCPTool, 
  MCPResource, 
  MCPPrompt,
  InitializeRequest,
  InitializeResponse,
  ToolCallRequest,
  ToolCallResponse,
  MCPServerCapabilities
} from '../types/mcp';
import { EWeLinkService } from './ewelinkService';

export class MCPService {
  private ewelinkService: EWeLinkService;
  private initialized = false;
  private clientCapabilities: any = {};

  constructor() {
    this.ewelinkService = new EWeLinkService();
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return await this.handleInitialize(request as InitializeRequest);
        case 'initialized':
          return this.handleInitialized();
        case 'tools/list':
          return this.handleToolsList();
        case 'tools/call':
          return await this.handleToolCall(request as ToolCallRequest);
        case 'resources/list':
          return this.handleResourcesList();
        case 'resources/read':
          return await this.handleResourceRead(request);
        case 'prompts/list':
          return this.handlePromptsList();
        case 'prompts/get':
          return await this.handlePromptGet(request);
        default:
          return this.createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error: any) {
      console.error('MCP Service Error:', error);
      return this.createErrorResponse(request.id, -32603, error.message || 'Internal error');
    }
  }

  private async handleInitialize(request: InitializeRequest): Promise<InitializeResponse> {
    this.clientCapabilities = request.params.capabilities;
    this.initialized = true;

    const serverCapabilities: MCPServerCapabilities = {
      tools: {
        listChanged: false
      },
      resources: {
        subscribe: false,
        listChanged: false
      },
      prompts: {
        listChanged: false
      },
      experimental: {}
    };

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: serverCapabilities,
        serverInfo: {
          name: 'ewelink-mcp-server',
          version: '1.0.0'
        }
      }
    };
  }

  private handleInitialized(): MCPResponse {
    return {
      jsonrpc: '2.0',
      result: {}
    };
  }

  private handleToolsList(): MCPResponse {
    const tools: MCPTool[] = [
      {
        name: 'list_devices',
        description: 'List all eWeLink devices',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_device',
        description: 'Get details of a specific eWeLink device',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'The device ID'
            }
          },
          required: ['deviceId']
        }
      },
      {
        name: 'control_device',
        description: 'Control an eWeLink device',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'The device ID'
            },
            params: {
              type: 'object',
              description: 'Device control parameters'
            }
          },
          required: ['deviceId', 'params']
        }
      },
      {
        name: 'get_device_status',
        description: 'Get current status of an eWeLink device',
        inputSchema: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'The device ID'
            }
          },
          required: ['deviceId']
        }
      }
    ];

    return {
      jsonrpc: '2.0',
      result: {
        tools
      }
    };
  }

  private async handleToolCall(request: ToolCallRequest): Promise<ToolCallResponse> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_devices':
          return await this.listDevices(request.id);
        case 'get_device':
          return await this.getDevice(request.id, args.deviceId);
        case 'control_device':
          return await this.controlDevice(request.id, args.deviceId, args.params);
        case 'get_device_status':
          return await this.getDeviceStatus(request.id, args.deviceId);
        default:
          return this.createToolErrorResponse(request.id, `Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return this.createToolErrorResponse(request.id, error.message);
    }
  }

  private async listDevices(requestId?: string | number): Promise<ToolCallResponse> {
    try {
      const devices = await this.ewelinkService.getDevices();
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(devices, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return this.createToolErrorResponse(requestId, `Failed to list devices: ${error.message}`);
    }
  }

  private async getDevice(requestId: string | number | undefined, deviceId: string): Promise<ToolCallResponse> {
    try {
      const device = await this.ewelinkService.getDevice(deviceId);
      
      if (!device) {
        return this.createToolErrorResponse(requestId, `Device not found: ${deviceId}`);
      }

      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(device, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return this.createToolErrorResponse(requestId, `Failed to get device: ${error.message}`);
    }
  }

  private async controlDevice(requestId: string | number | undefined, deviceId: string, params: Record<string, any>): Promise<ToolCallResponse> {
    try {
      const success = await this.ewelinkService.controlDevice({ deviceId, params });
      
      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [{
            type: 'text',
            text: success ? `Device ${deviceId} controlled successfully` : `Failed to control device ${deviceId}`
          }]
        }
      };
    } catch (error: any) {
      return this.createToolErrorResponse(requestId, `Failed to control device: ${error.message}`);
    }
  }

  private async getDeviceStatus(requestId: string | number | undefined, deviceId: string): Promise<ToolCallResponse> {
    try {
      const status = await this.ewelinkService.getDeviceStatus(deviceId);
      
      if (!status) {
        return this.createToolErrorResponse(requestId, `Device status not found: ${deviceId}`);
      }

      return {
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return this.createToolErrorResponse(requestId, `Failed to get device status: ${error.message}`);
    }
  }

  private handleResourcesList(): MCPResponse {
    const resources: MCPResource[] = [
      {
        uri: 'ewelink://devices',
        name: 'eWeLink Devices',
        description: 'List of all eWeLink devices',
        mimeType: 'application/json'
      }
    ];

    return {
      jsonrpc: '2.0',
      result: {
        resources
      }
    };
  }

  private async handleResourceRead(request: MCPRequest): Promise<MCPResponse> {
    const uri = request.params?.uri;
    
    if (uri === 'ewelink://devices') {
      try {
        const devices = await this.ewelinkService.getDevices();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(devices, null, 2)
            }]
          }
        };
      } catch (error: any) {
        return this.createErrorResponse(request.id, -32603, `Failed to read resource: ${error.message}`);
      }
    }

    return this.createErrorResponse(request.id, -32602, `Unknown resource: ${uri}`);
  }

  private handlePromptsList(): MCPResponse {
    const prompts: MCPPrompt[] = [
      {
        name: 'device_control_help',
        description: 'Get help with controlling eWeLink devices',
        arguments: [
          {
            name: 'device_type',
            description: 'Type of device (switch, light, sensor, etc.)',
            required: false
          }
        ]
      }
    ];

    return {
      jsonrpc: '2.0',
      result: {
        prompts
      }
    };
  }

  private async handlePromptGet(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    if (name === 'device_control_help') {
      const deviceType = args?.device_type || 'general';
      
      let helpText = `# eWeLink Device Control Help\n\n`;
      
      switch (deviceType) {
        case 'switch':
          helpText += `## Switch Control\n- Turn on: {"switch": "on"}\n- Turn off: {"switch": "off"}`;
          break;
        case 'light':
          helpText += `## Light Control\n- Turn on: {"switch": "on"}\n- Turn off: {"switch": "off"}\n- Brightness: {"bright": 50} (0-100)`;
          break;
        default:
          helpText += `## General Device Control\nUse the control_device tool with appropriate parameters for your device type.`;
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          description: `Help for controlling ${deviceType} devices`,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: helpText
            }
          }]
        }
      };
    }

    return this.createErrorResponse(request.id, -32602, `Unknown prompt: ${name}`);
  }

  private createErrorResponse(id: string | number | undefined, code: number, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
  }

  private createToolErrorResponse(id: string | number | undefined, message: string): ToolCallResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{
          type: 'text',
          text: `Error: ${message}`
        }],
        isError: true
      }
    };
  }

  setEWeLinkToken(token: string) {
    this.ewelinkService.setAccessToken(token);
  }
}
