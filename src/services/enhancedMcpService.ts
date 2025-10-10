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
    const sessionId = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
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
    try {
      const { device_id } = args;
      
      if (!device_id) {
        throw new Error('device_id is required');
      }

      const user = await this.getUserWithTokens(session);
      if (!user || !user.ewelinkAccessToken) {
        throw new Error('eWeLink account not connected');
      }

      const ewelinkService = new EWeLinkService();
      ewelinkService.setAccessToken(user.ewelinkAccessToken);
      
      const device = await ewelinkService.getDevice(device_id);

      if (!device) {
        throw new Error(`Device ${device_id} not found`);
      }

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: device.deviceid,
              name: device.name,
              type: device.type,
              model: device.model,
              online: device.online,
              params: device.params,
              capabilities: device.capabilities
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
            text: `Error getting device: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  private static async executeGetDeviceStatus(session: MCPSession, args: any): Promise<ToolCallResponse> {
    try {
      const { device_id } = args;
      
      if (!device_id) {
        throw new Error('device_id is required');
      }

      const user = await this.getUserWithTokens(session);
      if (!user || !user.ewelinkAccessToken) {
        throw new Error('eWeLink account not connected');
      }

      const ewelinkService = new EWeLinkService();
      ewelinkService.setAccessToken(user.ewelinkAccessToken);
      
      const status = await ewelinkService.getDeviceStatus(device_id);

      if (!status) {
        throw new Error(`Cannot get status for device ${device_id}`);
      }

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              device_id,
              status,
              timestamp: new Date().toISOString()
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
            text: `Error getting device status: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  private static async executeListTenants(session: MCPSession, args: any): Promise<ToolCallResponse> {
    try {
      // Only global admins can list tenants
      if (session.userType !== 'global_admin') {
        throw new Error('Only global admins can list tenants');
      }

      const statusFilter = args?.status;

      const where: any = {};
      if (statusFilter) {
        where.status = statusFilter;
      }

      const tenants = await prisma.tenant.findMany({
        where,
        select: {
          id: true,
          name: true,
          domain: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          _count: {
            select: {
              admins: true,
              users: true,
              devices: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tenants: tenants.map(t => ({
                id: t.id,
                name: t.name,
                domain: t.domain,
                status: t.status,
                createdAt: t.createdAt,
                approvedAt: t.approvedAt,
                adminCount: t._count.admins,
                userCount: t._count.users,
                deviceCount: t._count.devices
              })),
              total: tenants.length
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
            text: `Error listing tenants: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  private static async executeListTenantUsers(session: MCPSession, args: any): Promise<ToolCallResponse> {
    try {
      // Only tenant admins can list their tenant users
      if (session.userType !== 'tenant_admin') {
        throw new Error('Only tenant admins can list tenant users');
      }

      if (!session.tenantId) {
        throw new Error('Tenant ID not found in session');
      }

      const statusFilter = args?.status;

      const where: any = {
        tenantId: session.tenantId
      };
      
      if (statusFilter) {
        where.status = statusFilter;
      }

      const users = await prisma.tenantUser.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          lastActive: true,
          ewelinkUserId: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        jsonrpc: '2.0',
        id: session.id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              tenantId: session.tenantId,
              users: users.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name,
                status: u.status,
                createdAt: u.createdAt,
                lastActive: u.lastActive,
                hasEWeLinkAuth: !!u.ewelinkUserId
              })),
              total: users.length
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
            text: `Error listing tenant users: ${error.message}`
          }],
          isError: true
        }
      };
    }
  }

  private static async readDevicesResource(session: MCPSession, id: any): Promise<MCPResponse> {
    try {
      const user = await this.getUserWithTokens(session);
      if (!user || !user.ewelinkAccessToken) {
        return this.createSuccessResponse(id, {
          contents: [{
            uri: 'ewelink://devices',
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'eWeLink account not connected', devices: [] })
          }]
        });
      }

      const ewelinkService = new EWeLinkService();
      ewelinkService.setAccessToken(user.ewelinkAccessToken);
      const devices = await ewelinkService.getDevices();

      return this.createSuccessResponse(id, {
        contents: [{
          uri: 'ewelink://devices',
          mimeType: 'application/json',
          text: JSON.stringify({
            devices: devices.map(d => ({
              id: d.deviceid,
              name: d.name,
              type: d.type,
              model: d.model,
              online: d.online,
              params: d.params
            })),
            total: devices.length
          }, null, 2)
        }]
      });
    } catch (error: any) {
      return this.createSuccessResponse(id, {
        contents: [{
          uri: 'ewelink://devices',
          mimeType: 'application/json',
          text: JSON.stringify({ error: error.message, devices: [] })
        }]
      });
    }
  }

  private static async readUserProfileResource(session: MCPSession, id: any): Promise<MCPResponse> {
    try {
      let userProfile: any = {
        userId: session.userId,
        userType: session.userType,
        tenantId: session.tenantId,
        sessionId: session.id,
        connected: false
      };

      const user = await this.getUserWithTokens(session);
      if (user && user.ewelinkAccessToken) {
        userProfile.connected = true;
        userProfile.ewelinkUserId = user.ewelinkUserId;
        
        // Try to get eWeLink user info
        try {
          const ewelinkService = new EWeLinkService();
          ewelinkService.setAccessToken(user.ewelinkAccessToken);
          const userInfo = await ewelinkService.getUserInfo();
          userProfile.ewelinkUserInfo = userInfo;
        } catch (error) {
          // Silently fail if can't get user info
        }
      }

      return this.createSuccessResponse(id, {
        contents: [{
          uri: 'ewelink://user/profile',
          mimeType: 'application/json',
          text: JSON.stringify(userProfile, null, 2)
        }]
      });
    } catch (error: any) {
      return this.createSuccessResponse(id, {
        contents: [{
          uri: 'ewelink://user/profile',
          mimeType: 'application/json',
          text: JSON.stringify({ error: error.message })
        }]
      });
    }
  }

  private static async getDeviceControlPrompt(session: MCPSession, id: any, args: any): Promise<MCPResponse> {
    const instruction = args?.instruction || 'control my devices';
    
    const promptText = `You are an eWeLink smart home assistant. Help the user with the following request:

"${instruction}"

Available Tools:
- list_devices: Get all connected devices
- get_device: Get detailed information about a specific device
- control_device: Control a device (turn on/off, adjust settings, etc.)
- get_device_status: Get current status of a device

Common Device Control Examples:
- Turn on/off: {"switch": "on"} or {"switch": "off"}
- Brightness (0-100): {"bright": 75}
- Color temperature: {"colorTemp": 50}

First, list the devices to see what's available, then help the user control them based on their request.`;

    return this.createSuccessResponse(id, {
      description: 'Assistant for controlling eWeLink devices with natural language',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: promptText
        }
      }]
    });
  }

  private static async getDeviceStatusPrompt(session: MCPSession, id: any, args: any): Promise<MCPResponse> {
    const format = args?.format || 'summary';
    
    let promptText = 'Generate a comprehensive status report of all eWeLink devices.\n\n';
    
    if (format === 'summary') {
      promptText += `Format: Provide a brief summary including:
- Total number of devices
- Number of online vs offline devices
- Any devices that need attention
- Quick overview of device states`;
    } else if (format === 'detailed') {
      promptText += `Format: Provide detailed information for each device:
- Device name and type
- Online/offline status
- Current settings and parameters
- Last known state
- Any alerts or issues`;
    } else if (format === 'json') {
      promptText += 'Format: Return structured JSON data with all device information';
    }
    
    promptText += '\n\nUse the list_devices and get_device_status tools to gather the information.';

    return this.createSuccessResponse(id, {
      description: 'Generate a comprehensive status report of all devices',
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: promptText
        }
      }]
    });
  }
}
