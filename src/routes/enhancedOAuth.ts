import { Router, Request, Response } from 'express';
import { EnhancedOAuthService } from '../services/enhancedOAuthService';
import { globalAdminAuthMiddleware, tenantAdminAuthMiddleware, tenantUserAuthMiddleware } from '../middleware/auth';
import { GlobalAdminService } from '../services/globalAdminService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Global Admin OAuth Authorization
router.get('/global/authorize', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    
    const config = EnhancedOAuthService.getGlobalOAuthConfig();
    if (!config) {
      return res.status(500).json({ 
        error: 'Global OAuth configuration not found. Please configure eWeLink OAuth settings.' 
      });
    }

    // Generate state with global admin ID
    const state = EnhancedOAuthService.generateOAuthState({ 
      globalAdminId,
      userType: 'global_admin'
    });

    const authUrl = EnhancedOAuthService.generateAuthUrl(config, state);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize eWeLink access'
    });

  } catch (error: any) {
    console.error('Global OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Tenant Admin OAuth Authorization
router.get('/:tenantId/admin/authorize', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenantAdminId = (req as any).tenantAdmin?.id;
    const adminTenantId = (req as any).tenantAdmin?.tenantId;

    // Verify tenant admin belongs to the requested tenant
    if (adminTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }

    const config = await EnhancedOAuthService.getTenantOAuthConfig(tenantId);
    if (!config) {
      return res.status(400).json({ 
        error: 'Tenant OAuth configuration not found. Please configure eWeLink OAuth settings first.' 
      });
    }

    // Generate state with tenant admin ID
    const state = EnhancedOAuthService.generateOAuthState({ 
      tenantAdminId,
      tenantId,
      userType: 'tenant_admin'
    });

    const authUrl = EnhancedOAuthService.generateAuthUrl(config, state);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize eWeLink access'
    });

  } catch (error: any) {
    console.error('Tenant admin OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Tenant User OAuth Authorization
router.get('/:tenantId/user/authorize', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Verify user exists in tenant
    const user = await prisma.tenantUser.findUnique({
      where: { 
        email_tenantId: {
          email,
          tenantId
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in tenant' });
    }

    const config = await EnhancedOAuthService.getTenantOAuthConfig(tenantId);
    if (!config) {
      return res.status(400).json({ 
        error: 'Tenant OAuth configuration not found. Please contact your tenant administrator.' 
      });
    }

    // Generate state with user email
    const state = EnhancedOAuthService.generateOAuthState({ 
      userEmail: email,
      tenantId,
      userType: 'tenant_user'
    });

    const authUrl = EnhancedOAuthService.generateAuthUrl(config, state);

    res.json({
      authUrl,
      message: 'Redirect user to this URL to authorize eWeLink access'
    });

  } catch (error: any) {
    console.error('Tenant user OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Global OAuth Callback
router.get('/global/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ 
        error: 'OAuth authorization failed',
        details: error 
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const result = await EnhancedOAuthService.handleGlobalAdminCallback(
      code, 
      state as string
    );

    // In production, you might want to redirect to frontend with token
    res.json({
      message: 'eWeLink authorization successful',
      token: result.token,
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
        role: 'global_admin',
        hasEWeLinkAuth: true
      },
      ewelinkUser: {
        userid: result.ewelinkUser.userid,
        email: result.ewelinkUser.email,
        nickname: result.ewelinkUser.nickname
      }
    });

  } catch (error: any) {
    console.error('Global OAuth callback error:', error);
    res.status(400).json({ error: error.message || 'OAuth callback failed' });
  }
});

// Tenant OAuth Callback
router.get('/:tenantId/callback', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ 
        error: 'OAuth authorization failed',
        details: error 
      });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Parse state to determine user type
    let stateData: any = {};
    if (state && typeof state === 'string') {
      try {
        stateData = EnhancedOAuthService.parseOAuthState(state);
      } catch (error) {
        console.error('Failed to parse OAuth state:', error);
      }
    }

    let result: any;

    if (stateData.userType === 'tenant_admin') {
      result = await EnhancedOAuthService.handleTenantAdminCallback(
        tenantId,
        code,
        state as string
      );

      res.json({
        message: 'eWeLink authorization successful',
        token: result.token,
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: 'tenant_admin',
          tenantId: result.admin.tenantId,
          hasEWeLinkAuth: true
        },
        ewelinkUser: {
          userid: result.ewelinkUser.userid,
          email: result.ewelinkUser.email,
          nickname: result.ewelinkUser.nickname
        }
      });

    } else if (stateData.userType === 'tenant_user') {
      result = await EnhancedOAuthService.handleTenantUserCallback(
        tenantId,
        code,
        state as string
      );

      res.json({
        message: 'eWeLink authorization successful',
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: 'tenant_user',
          tenantId: result.user.tenantId,
          hasEWeLinkAuth: true
        },
        ewelinkUser: {
          userid: result.ewelinkUser.userid,
          email: result.ewelinkUser.email,
          nickname: result.ewelinkUser.nickname
        }
      });

    } else {
      return res.status(400).json({ error: 'Invalid OAuth state - user type not specified' });
    }

  } catch (error: any) {
    console.error('Tenant OAuth callback error:', error);
    res.status(400).json({ error: error.message || 'OAuth callback failed' });
  }
});

// Get OAuth Status for Global Admin
router.get('/global/status', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const admin = await GlobalAdminService.getById(globalAdminId);

    if (!admin) {
      return res.status(404).json({ error: 'Global admin not found' });
    }

    const hasGlobalConfig = !!EnhancedOAuthService.getGlobalOAuthConfig();

    res.json({
      hasOAuthConfig: hasGlobalConfig,
      isConnected: !!admin.ewelinkAccessToken,
      ewelinkUserId: admin.ewelinkUserId,
      lastActive: admin.lastActive
    });

  } catch (error: any) {
    console.error('Get global OAuth status error:', error);
    res.status(500).json({ error: 'Failed to get OAuth status' });
  }
});

// Get OAuth Status for Tenant
router.get('/:tenantId/status', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { userId, userType } = req.query;

    const config = await EnhancedOAuthService.getTenantOAuthConfig(tenantId);
    const hasConfig = !!config;

    let isConnected = false;
    let ewelinkUserId: string | null = null;
    let lastActive: Date | null = null;

    if (userId && userType) {
      if (userType === 'tenant_admin') {
        const admin = await prisma.tenantAdmin.findUnique({
          where: { id: userId as string }
        });
        if (admin) {
          isConnected = !!admin.ewelinkAccessToken;
          ewelinkUserId = admin.ewelinkUserId;
          lastActive = admin.lastActive;
        }
      } else if (userType === 'tenant_user') {
        const user = await prisma.tenantUser.findUnique({
          where: { id: userId as string }
        });
        if (user) {
          isConnected = !!user.ewelinkAccessToken;
          ewelinkUserId = user.ewelinkUserId;
          lastActive = user.lastActive;
        }
      }
    }

    res.json({
      hasOAuthConfig: hasConfig,
      isConnected,
      ewelinkUserId,
      lastActive
    });

  } catch (error: any) {
    console.error('Get tenant OAuth status error:', error);
    res.status(500).json({ error: 'Failed to get OAuth status' });
  }
});

// Disconnect OAuth for authenticated user
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { userType, userId } = req.body;

    if (!userType || !userId) {
      return res.status(400).json({ error: 'User type and ID are required' });
    }

    switch (userType) {
      case 'global_admin':
        await prisma.globalAdmin.update({
          where: { id: userId },
          data: {
            ewelinkAccessToken: null,
            ewelinkRefreshToken: null,
            ewelinkUserId: null
          }
        });
        break;

      case 'tenant_admin':
        await prisma.tenantAdmin.update({
          where: { id: userId },
          data: {
            ewelinkAccessToken: null,
            ewelinkRefreshToken: null,
            ewelinkUserId: null
          }
        });
        break;

      case 'tenant_user':
        await prisma.tenantUser.update({
          where: { id: userId },
          data: {
            ewelinkAccessToken: null,
            ewelinkRefreshToken: null,
            ewelinkUserId: null
          }
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid user type' });
    }

    res.json({ message: 'eWeLink account disconnected successfully' });

  } catch (error: any) {
    console.error('OAuth disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect OAuth' });
  }
});

export { router as enhancedOAuthRoutes };
