import { Router, Request, Response } from 'express';
import { EnhancedMCPService } from '../services/enhancedMcpService';
import { PrismaClient } from '@prisma/client';
import { MCPRequest } from '../types/mcp';

const router = Router();
const prisma = new PrismaClient();

// MCP HTTP Transport - 2025-06-18 specification
// Supports both GET and POST methods for different MCP operations

/**
 * MCP Endpoint: /mcp/:tenantId/:userId
 * Supports Global Admin, Tenant Admin, and Tenant User access
 */
router.all('/:tenantId/:userId', async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = req.params;
    const method = req.method.toLowerCase();

    // Set CORS headers for MCP clients
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Authorization');

    if (method === 'options') {
      return res.status(200).end();
    }

    // Get or create session ID
    let sessionId = req.headers['mcp-session-id'] as string;
    
    // Validate user and determine user type
    const userInfo = await validateUserAccess(tenantId, userId);
    if (!userInfo) {
      return res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'User not found or access denied'
        }
      });
    }

    // Create session if not exists
    if (!sessionId) {
      sessionId = EnhancedMCPService.createSession(userId, userInfo.userType, tenantId);
      res.header('Mcp-Session-Id', sessionId);
    }

    // Handle different HTTP methods
    if (method === 'get') {
      return await handleMCPGet(req, res, sessionId, userInfo);
    } else if (method === 'post') {
      return await handleMCPPost(req, res, sessionId, userInfo);
    } else {
      return res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Method not allowed'
        }
      });
    }

  } catch (error: any) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error.message
      }
    });
  }
});

/**
 * Handle MCP GET requests (typically for server info, capabilities)
 */
async function handleMCPGet(req: Request, res: Response, sessionId: string, userInfo: any) {
  const { action } = req.query;

  switch (action) {
    case 'server-info':
      return res.json({
        jsonrpc: '2.0',
        result: {
          name: 'eWeLink MCP Server',
          version: '1.0.0',
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true },
            prompts: { listChanged: true },
            logging: {},
            experimental: {
              ewelink: { version: '1.0.0', multiTenant: true }
            }
          },
          userType: userInfo.userType,
          tenantId: userInfo.tenantId,
          sessionId
        }
      });

    case 'health':
      return res.json({
        jsonrpc: '2.0',
        result: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          sessionId,
          userType: userInfo.userType
        }
      });

    default:
      // Default GET returns server capabilities
      return res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true },
            prompts: { listChanged: true },
            logging: {}
          },
          serverInfo: {
            name: 'eWeLink MCP Server',
            version: '1.0.0'
          }
        }
      });
  }
}

/**
 * Handle MCP POST requests (JSON-RPC 2.0 protocol)
 */
async function handleMCPPost(req: Request, res: Response, sessionId: string, userInfo: any) {
  const mcpRequest: MCPRequest = req.body;

  // Validate JSON-RPC 2.0 format
  if (!mcpRequest.jsonrpc || mcpRequest.jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: mcpRequest.id,
      error: {
        code: -32600,
        message: 'Invalid JSON-RPC 2.0 request'
      }
    });
  }

  // Handle the MCP request
  const response = await EnhancedMCPService.handleRequest(sessionId, mcpRequest);
  
  if (response) {
    // Update session header if needed
    const session = EnhancedMCPService.getSession(sessionId);
    if (session) {
      res.header('Mcp-Session-Id', sessionId);
    }

    return res.json(response);
  } else {
    // No response needed (notification)
    return res.status(204).end();
  }
}

/**
 * Validate user access and determine user type
 */
async function validateUserAccess(tenantId: string, userId: string): Promise<{
  userType: 'global_admin' | 'tenant_admin' | 'tenant_user';
  tenantId: string;
  userId: string;
} | null> {
  
  // Check if user is Global Admin (can access any tenant)
  const globalAdmin = await prisma.globalAdmin.findUnique({
    where: { id: userId }
  });

  if (globalAdmin) {
    return {
      userType: 'global_admin',
      tenantId,
      userId
    };
  }

  // Check if user is Tenant Admin
  const tenantAdmin = await prisma.tenantAdmin.findFirst({
    where: {
      id: userId,
      tenantId: tenantId
    },
    include: { tenant: true }
  });

  if (tenantAdmin && tenantAdmin.tenant.status === 'APPROVED') {
    return {
      userType: 'tenant_admin',
      tenantId,
      userId
    };
  }

  // Check if user is Tenant User
  const tenantUser = await prisma.tenantUser.findFirst({
    where: {
      id: userId,
      tenantId: tenantId
    },
    include: { tenant: true }
  });

  if (tenantUser && tenantUser.tenant.status === 'APPROVED' && tenantUser.status === 'ACTIVE') {
    return {
      userType: 'tenant_user',
      tenantId,
      userId
    };
  }

  return null;
}

/**
 * MCP Server Discovery Endpoint
 * GET /mcp/discover - Returns available MCP servers for a user
 */
router.get('/discover', async (req: Request, res: Response) => {
  try {
    const { email, tenantDomain } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const servers: any[] = [];

    // Check if user is Global Admin
    const globalAdmin = await prisma.globalAdmin.findUnique({
      where: { email: email as string }
    });

    if (globalAdmin) {
      // Global Admin can access any tenant
      const tenants = await prisma.tenant.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, name: true, domain: true }
      });

      for (const tenant of tenants) {
        servers.push({
          name: `eWeLink MCP (${tenant.name})`,
          url: `${getBaseUrl(req)}/mcp/${tenant.id}/${globalAdmin.id}`,
          description: `eWeLink device control for ${tenant.name}`,
          userType: 'global_admin',
          tenantId: tenant.id,
          tenantName: tenant.name
        });
      }
    }

    // Check if user is Tenant Admin
    const tenantAdmins = await prisma.tenantAdmin.findMany({
      where: { email: email as string },
      include: { tenant: true }
    });

    for (const admin of tenantAdmins) {
      if (admin.tenant.status === 'APPROVED') {
        servers.push({
          name: `eWeLink MCP (${admin.tenant.name})`,
          url: `${getBaseUrl(req)}/mcp/${admin.tenantId}/${admin.id}`,
          description: `eWeLink device control for ${admin.tenant.name}`,
          userType: 'tenant_admin',
          tenantId: admin.tenantId,
          tenantName: admin.tenant.name
        });
      }
    }

    // Check if user is Tenant User
    let tenantUsers: any[] = [];
    
    if (tenantDomain) {
      // Find tenant by domain
      const tenant = await prisma.tenant.findUnique({
        where: { domain: tenantDomain as string }
      });

      if (tenant) {
        tenantUsers = await prisma.tenantUser.findMany({
          where: {
            email: email as string,
            tenantId: tenant.id
          },
          include: { tenant: true }
        });
      }
    } else {
      // Find all tenant users with this email
      tenantUsers = await prisma.tenantUser.findMany({
        where: { email: email as string },
        include: { tenant: true }
      });
    }

    for (const user of tenantUsers) {
      if (user.tenant.status === 'APPROVED' && user.status === 'ACTIVE') {
        servers.push({
          name: `eWeLink MCP (${user.tenant.name})`,
          url: `${getBaseUrl(req)}/mcp/${user.tenantId}/${user.id}`,
          description: `eWeLink device control for ${user.tenant.name}`,
          userType: 'tenant_user',
          tenantId: user.tenantId,
          tenantName: user.tenant.name
        });
      }
    }

    res.json({
      servers,
      total: servers.length,
      protocolVersion: '2025-06-18'
    });

  } catch (error: any) {
    console.error('MCP discovery error:', error);
    res.status(500).json({ error: 'Failed to discover MCP servers' });
  }
});

/**
 * MCP Session Management
 */
router.get('/sessions/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = EnhancedMCPService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      userId: session.userId,
      userType: session.userType,
      tenantId: session.tenantId,
      initialized: session.initialized,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    });

  } catch (error: any) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
});

/**
 * Cleanup expired sessions (called periodically)
 */
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    EnhancedMCPService.cleanupExpiredSessions();
    res.json({ message: 'Session cleanup completed' });
  } catch (error: any) {
    console.error('Session cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

/**
 * Get base URL for server discovery
 */
function getBaseUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

export { router as enhancedMcpRoutes };
