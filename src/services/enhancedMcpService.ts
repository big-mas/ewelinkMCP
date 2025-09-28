import { PrismaClient } from '@prisma/client';
import { EWeLinkService } from './ewelinkService';
import { decrypt } from '../utils/encryption';
import {
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPError,
  InitializeRequest,
  InitializeResponse,
  MCPServerCapabilities,
  MCPTool,
  ToolCallRequest,
  ToolCallResponse,
  MCPResource,
  MCPPrompt
} from '../types/mcp';

const prisma = new PrismaClient();

export interface MCPSession {
  id: string;
  userId: string;
  userType: 'global_admin' | 'tenant_admin' | 'tenant_user';
  tenantId?: string;
  initialized: boolean;
  capabilities?: any;
  clientInfo?: any;
  createdAt: Date;
  lastActivity: Date;
}

export class EnhancedMCPService {
  private static sessions = new Map<string, MCPSession>();
  private static readonly PROTOCOL_VERSION = '2025-06-18';

  /**
   * Create a new MCP session
   */
  static createSession(userId: string, userType: 'global_admin' | 'tenant_admin' | 'tenant_user', tenantId?: string): string {
    const sessionId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: MCPSession = {
      id: sessionId,
      userId,
      userType,
      tenantId,
      initialized: false,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    
    // Update database with session ID
    this.updateUserMCPSession(userId, userType, sessionId);

    return sessionId;
  }

  /**
   * Get MCP session
   */
  static getSession(sessionId: string): MCPSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  /**
   * Update user's MCP session in database
   */
  private static async updateUserMCPSession(userId: string, userType: string, sessionId: string): Promise<void> {
    try {
      switch (userType) {
        case 'global_admin':
          await prisma.globalAdmin.update({
            where: { id: userId },
            data: { mcpSessionId: sessionId, lastActive: new Date() }
          });
          break;
        case 'tenant_admin':
          await prisma.tenantAdmin.update({
            where: { id: userId },
            data: { mcpSessionId: sessionId, lastActive: new Date() }
          });
          break;
        case 'tenant_user':
          await prisma.tenantUser.update({
            where: { id: userId },
            data: { mcpSessionId: sessionId, lastActive: new Date() }
          });
          break;
      }
    } catch (error) {
      console.error('Failed to update user MCP session:', error);
    }
  }

  /**
   * Handle MCP request
   */
  static async handleRequest(sessionId: string, request: MCPRequest): Promise<MCPResponse | MCPNotification | null> {
    const session = this.getSession(sessionId);
    if (!session) {
      return this.createErrorResponse(request.id, -32001, 'Session not found');
    }

    try {
      switch (request.method) {
        case 'initialize':
          return await this.handleInitialize(session, request as InitializeRequest);
        
        case 'initialized':
          session.initialized = true;
          return null; // No response for notification
        
        case 'tools/list':
          return await this.handleToolsList(session, request);
        
        case 'tools/call':
          return await this.handleToolCall(session, request as ToolCallRequest);
        
        case 'resources/list':
          return await this.handleResourcesList(session, request);
        
        case 'resources/read':
          return await this.handleResourceRead(session, request);
        
        case 'prompts/list':
          return await this.handlePromptsList(session, request);
        
        case 'prompts/get':
          return await this.handlePromptGet(session, request);
        
        case 'ping':
          return this.createSuccessResponse(request.id, { status: 'pong' });
        
        default:
          return this.createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error: any) {
      console.error('MCP request handling error:', error);
      return this.createErrorResponse(request.id, -32603, error.message || 'Internal error');
    }
  }

  /**
   * Handle initialize request
   */
  private static async handleInitialize(session: MCPSession, request: InitializeRequest): Promise<InitializeResponse> {
    session.capabilities = request.params.capabilities;
    session.clientInfo = request.params.clientInfo;

    const serverCapabilities: MCPServerCapabilities = {
      tools: {
        listChanged: true
      },
      resources: {
        subscribe: false,
        listChanged: true
      },
      prompts: {
        listChanged: true
      },
      logging: {},
      experimental: {
        ewelink: {
          version: '1.0.0',
          multiTenant: true
        }
      }
    };

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: this.PROTOCOL_VERSION,
        capabilities: serverCapabilities,
        serverInfo: {
          name: 'eWeLink MCP Server',
          version: '1.0.0'
        }
      }
    };
  }

  /**
   * Handle tools/list request
   */
  private static async handleToolsList(session: MCPSession, request: MCPRequest): Promise<MCPResponse> {
    const tools: MCPTool[] = [
      {
        name: 'list_devices',
        description: 'List all eWeLink devices accessible to the user',
        inputSchema: {
          type: 'object',
          properties: {
            online_only: {
              type: 'boolean',
              description: 'Only return online devices'
            }
          }
        }
      },
      {
        name: 'get_device',
        description: 'Get detailed information about a specific device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The eWeLink device ID'
            }
          },
          required: ['device_id']
        }
      },
      {
        name: 'control_device',
        description: 'Control an eWeLink device by setting parameters',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The eWeLink device ID'
            },
            params: {
              type: 'object',
              description: 'Device parameters to set (e.g., {"switch": "on"})'
            }
          },
          required: ['device_id', 'params']
        }
      },
      {
        name: 'get_device_status',
        description: 'Get current status and parameters of a device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The eWeLink device ID'
            }
          },
          required: ['device_id']
        }
      }
    ];

    // Add tenant-specific tools for admins
    if (session.userType === 'global_admin') {
      tools.push({
        name: 'list_tenants',
        description: 'List all tenants (Global Admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'DELETED'],
              description: 'Filter tenants by status'
            }
          }
        }
      });
    }

    if (session.userType === 'tenant_admin') {
      tools.push({
        name: 'list_tenant_users',
        description: 'List users in your tenant (Tenant Admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'],
              description: 'Filter users by status'
            }
          }
        }
      });
    }

    return this.createSuccessResponse(request.id, { tools });
  }

  /**
   * Handle tools/call request
   */
  private static async handleToolCall(session: MCPSession, request: ToolCallRequest): Promise<ToolCallResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_devices':
        return await this.executeListDevices(session, args);
      
      case 'get_device':
        return await this.executeGetDevice(session, args);
      
      case 'control_device':
        return await this.executeControlDevice(session, args);
      
      case 'get_device_status':
        return await this.executeGetDeviceStatus(session, args);
      
      case 'list_tenants':
        return await this.executeListTenants(session, args);
      
      case 'list_tenant_users':
        return await this.executeListTenantUsers(session, args);
      
      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [{
              type: 'text',
              text: `Unknown tool: ${name}`
            }],
            isError: true
          }
        };
    }
  }

  /**
   * Execute list_devices tool
   */
  private static async executeListDevices(session: MCPSession, args: any): Promise<ToolCallResponse> {
    try {
      const user = await this.getUserWithTokens(session);
      if (!user || !user.ewelinkAccessToken) {
        throw new Error('eWeLink account not connected');
      }

      const ewelinkService = new EWeLinkService();
      ewelinkService.setAccessToken(user.ewelinkAccessToken);
      
      const devices = await ewelinkService.getDevices();
      
      let filteredDevices = devices;
      if (args.online_only) {
        filteredDevices = devices.filter(device => device.online);
      }

      const deviceList = filteredDevices.map(device => ({
        id: device.deviceid,
        name: device.name,
        type: device.type,
        model: device.model,
        online: device.online,
        params: device.params
      }));

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              devices: deviceList,
              total: deviceList.length,
              online: deviceList.filter(d => d.online).length
            }, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: `Error listing devices: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  /**
   * Execute control_device tool
   */
  private static async executeControlDevice(session: MCPSession, args: any): Promise<ToolCallResponse> {
    try {
      const { device_id, params } = args;
      
      const user = await this.getUserWithTokens(session);
      if (!user || !user.ewelinkAccessToken) {
        throw new Error('eWeLink account not connected');
      }

      const ewelinkService = new EWeLinkService();
      ewelinkService.setAccessToken(user.ewelinkAccessToken);
      
      const success = await ewelinkService.controlDevice({ deviceId: device_id, params });

      // Log the control action
      await prisma.auditLog.create({
        data: {
          ...(session.userType === 'global_admin' && { globalAdminId: session.userId }),
          ...(session.userType === 'tenant_admin' && { tenantAdminId: session.userId }),
          ...(session.userType === 'tenant_user' && { tenantUserId: session.userId }),
          action: 'MCP_DEVICE_CONTROL',
          resource: `device:${device_id}`,
          details: JSON.stringify({ params, sessionId: session.id })
        }
      });

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success,
              device_id,
              params,
              message: success ? 'Device controlled successfully' : 'Device control failed'
            }, null, 2)
          }]
        }
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: `Error controlling device: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  /**
   * Get user with eWeLink tokens based on session
   */
  private static async getUserWithTokens(session: MCPSession): Promise<any> {
    switch (session.userType) {
      case 'global_admin':
        return await prisma.globalAdmin.findUnique({
          where: { id: session.userId },
          select: { ewelinkAccessToken: true, ewelinkRefreshToken: true, ewelinkUserId: true }
        });
      
      case 'tenant_admin':
        return await prisma.tenantAdmin.findUnique({
          where: { id: session.userId },
          select: { ewelinkAccessToken: true, ewelinkRefreshToken: true, ewelinkUserId: true }
        });
      
      case 'tenant_user':
        return await prisma.tenantUser.findUnique({
          where: { id: session.userId },
          select: { ewelinkAccessToken: true, ewelinkRefreshToken: true, ewelinkUserId: true }
        });
      
      default:
        return null;
    }
  }

  /**
   * Handle resources/list request
   */
  private static async handleResourcesList(session: MCPSession, request: MCPRequest): Promise<MCPResponse> {
    const resources: MCPResource[] = [
      {
        uri: 'ewelink://devices',
        name: 'eWeLink Devices',
        description: 'List of all accessible eWeLink devices',
        mimeType: 'application/json'
      },
      {
        uri: 'ewelink://user/profile',
        name: 'User Profile',
        description: 'Current user profile and connection status',
        mimeType: 'application/json'
      }
    ];

    return this.createSuccessResponse(request.id, { resources });
  }

  /**
   * Handle resources/read request
   */
  private static async handleResourceRead(session: MCPSession, request: MCPRequest): Promise<MCPResponse> {
    const { uri } = request.params;

    try {
      switch (uri) {
        case 'ewelink://devices':
          return await this.readDevicesResource(session, request.id);
        
        case 'ewelink://user/profile':
          return await this.readUserProfileResource(session, request.id);
        
        default:
          return this.createErrorResponse(request.id, -32602, `Unknown resource: ${uri}`);
      }
    } catch (error: any) {
      return this.createErrorResponse(request.id, -32603, error.message);
    }
  }

  /**
   * Handle prompts/list request
   */
  private static async handlePromptsList(session: MCPSession, request: MCPRequest): Promise<MCPResponse> {
    const prompts: MCPPrompt[] = [
      {
        name: 'device_control_assistant',
        description: 'Assistant for controlling eWeLink devices with natural language',
        arguments: [
          {
            name: 'instruction',
            description: 'Natural language instruction for device control',
            required: true
          }
        ]
      },
      {
        name: 'device_status_report',
        description: 'Generate a comprehensive status report of all devices',
        arguments: [
          {
            name: 'format',
            description: 'Report format (summary, detailed, json)',
            required: false
          }
        ]
      }
    ];

    return this.createSuccessResponse(request.id, { prompts });
  }

  /**
   * Handle prompts/get request
   */
  private static async handlePromptGet(session: MCPSession, request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'device_control_assistant':
        return await this.getDeviceControlPrompt(session, request.id, args);
      
      case 'device_status_report':
        return await this.getDeviceStatusPrompt(session, request.id, args);
      
      default:
        return this.createErrorResponse(request.id, -32602, `Unknown prompt: ${name}`);
    }
  }

  /**
   * Create success response
   */
  private static createSuccessResponse(id: string | number | undefined, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * Create error response
   */
  private static createErrorResponse(id: string | number | undefined, code: number, message: string, data?: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const timeDiff = now.getTime() - session.lastActivity.getTime();
      const hoursSinceActivity = timeDiff / (1000 * 60 * 60);

      if (hoursSinceActivity > 24) { // 24 hours timeout
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired MCP sessions`);
    }
  }

  // Additional helper methods would be implemented here...
  private static async executeGetDevice(session: MCPSession, args: any): Promise<ToolCallResponse> {
    // Implementation for get_device tool
    return {
      jsonrpc: '2.0',
      id: session.id,
      result: {
        content: [{ type: 'text', text: 'Not implemented yet' }]
      }
    };
  }

  private static async executeGetDeviceStatus(session: MCPSession, args: any): Promise<ToolCallResponse> {
    // Implementation for get_device_status tool
    return {
      jsonrpc: '2.0',
      id: session.id,
      result: {
        content: [{ type: 'text', text: 'Not implemented yet' }]
      }
    };
  }

  private static async executeListTenants(session: MCPSession, args: any): Promise<ToolCallResponse> {
    // Implementation for list_tenants tool (Global Admin only)
    return {
      jsonrpc: '2.0',
      id: session.id,
      result: {
        content: [{ type: 'text', text: 'Not implemented yet' }]
      }
    };
  }

  private static async executeListTenantUsers(session: MCPSession, args: any): Promise<ToolCallResponse> {
    // Implementation for list_tenant_users tool (Tenant Admin only)
    return {
      jsonrpc: '2.0',
      id: session.id,
      result: {
        content: [{ type: 'text', text: 'Not implemented yet' }]
      }
    };
  }

  private static async readDevicesResource(session: MCPSession, id: any): Promise<MCPResponse> {
    // Implementation for reading devices resource
    return this.createSuccessResponse(id, { content: [{ type: 'text', text: 'Not implemented yet' }] });
  }

  private static async readUserProfileResource(session: MCPSession, id: any): Promise<MCPResponse> {
    // Implementation for reading user profile resource
    return this.createSuccessResponse(id, { content: [{ type: 'text', text: 'Not implemented yet' }] });
  }

  private static async getDeviceControlPrompt(session: MCPSession, id: any, args: any): Promise<MCPResponse> {
    // Implementation for device control prompt
    return this.createSuccessResponse(id, { content: [{ type: 'text', text: 'Not implemented yet' }] });
  }

  private static async getDeviceStatusPrompt(session: MCPSession, id: any, args: any): Promise<MCPResponse> {
    // Implementation for device status prompt
    return this.createSuccessResponse(id, { content: [{ type: 'text', text: 'Not implemented yet' }] });
  }
}
