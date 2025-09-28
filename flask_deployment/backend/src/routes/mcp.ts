import { Router, Request, Response } from 'express';
import { MCPService } from '../services/mcpService';
import { authMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create MCP service instance per request to handle user-specific tokens
const createMCPService = async (userId: string): Promise<MCPService> => {
  const mcpService = new MCPService();
  
  // Get user's eWeLink token from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ewelinkAccessToken: true }
  });
  
  if (user?.ewelinkAccessToken) {
    mcpService.setEWeLinkToken(user.ewelinkAccessToken);
  }
  
  return mcpService;
};

// MCP HTTP endpoint - handles JSON-RPC over HTTP
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const mcpService = await createMCPService(userId);
    const response = await mcpService.handleRequest(req.body);
    
    res.json(response);
  } catch (error: any) {
    console.error('MCP endpoint error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: 'Internal server error'
      }
    });
  }
});

// MCP Server Info endpoint
router.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'ewelink-mcp-server',
    version: '1.0.0',
    description: 'eWeLink MCP Server for smart home device control',
    protocol_version: '2025-06-18',
    capabilities: {
      tools: {
        listChanged: false
      },
      resources: {
        subscribe: false,
        listChanged: false
      },
      prompts: {
        listChanged: false
      }
    }
  });
});

// Health check for MCP service
router.get('/health', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        ewelinkAccessToken: true,
        ewelinkUserId: true 
      }
    });

    const hasEWeLinkAuth = !!user?.ewelinkAccessToken;
    
    res.json({
      status: 'ok',
      mcp_ready: hasEWeLinkAuth,
      ewelink_connected: hasEWeLinkAuth,
      user_id: user?.ewelinkUserId || null
    });
  } catch (error: any) {
    console.error('MCP health check error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

export { router as mcpRoutes };
