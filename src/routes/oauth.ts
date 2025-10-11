import { Router, Request, Response } from 'express';
import { EWeLinkService } from '../services/ewelinkService';
import { authMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { config } from '../utils/config';

const router = Router();
const prisma = new PrismaClient();

// Initiate eWeLink OAuth flow
router.get('/authorize', authMiddleware, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const oauthUrl = EWeLinkService.generateOAuthUrl(state);
    
    res.json({
      oauth_url: oauthUrl,
      state: state
    });
  } catch (error: any) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// Handle eWeLink OAuth callback (legacy route)
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${config.frontendUrl}/oauth/error?error=${encodeURIComponent(error as string)}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/oauth/error?error=missing_parameters`);
    }
    
    // Decode state to get user ID
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return res.redirect(`${config.frontendUrl}/oauth/error?error=invalid_state`);
    }
    
    // Exchange code for tokens
    const ewelinkService = new EWeLinkService();
    const tokenData = await ewelinkService.exchangeCodeForToken(code as string);
    
    // Update user with eWeLink tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        ewelinkAccessToken: tokenData.access_token,
        ewelinkRefreshToken: tokenData.refresh_token,
        ewelinkUserId: tokenData.user?.userid || null
      }
    });
    
    // Redirect to frontend success page
    res.redirect(`${config.frontendUrl}/oauth/success`);
    
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`${config.frontendUrl}/oauth/error?error=callback_failed`);
  }
});

// Handle tenant-specific eWeLink OAuth callback
router.get('/callback/:tenantId', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    const { tenantId } = req.params;
    
    console.log(`🔗 Tenant-specific OAuth callback for tenant: ${tenantId}`);
    
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${config.frontendUrl}/oauth/error?error=${encodeURIComponent(error as string)}&tenant=${tenantId}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/oauth/error?error=missing_parameters&tenant=${tenantId}`);
    }
    
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    if (!tenant) {
      console.error('Tenant not found:', tenantId);
      return res.redirect(`${config.frontendUrl}/oauth/error?error=tenant_not_found`);
    }
    
    // Decode state to get user ID and tenant info
    let userId: string;
    let stateTenantId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
      stateTenantId = stateData.tenantId;
      
      // Verify tenant ID matches
      if (stateTenantId !== tenantId) {
        throw new Error('Tenant ID mismatch');
      }
    } catch (err) {
      console.error('Invalid state parameter:', err);
      return res.redirect(`${config.frontendUrl}/oauth/error?error=invalid_state&tenant=${tenantId}`);
    }
    
    // Create eWeLink service with tenant-specific config
    const ewelinkService = new EWeLinkService();
    
    // Use tenant's OAuth credentials if available
    if (tenant.ewelinkClientId && tenant.ewelinkClientSecret) {
      // TODO: Initialize service with tenant-specific credentials
      console.log('🔧 Using tenant-specific OAuth credentials');
    }
    
    const tokenData = await ewelinkService.exchangeCodeForToken(code as string);
    
    // Update tenant user with eWeLink tokens
    await prisma.tenantUser.updateMany({
      where: { 
        id: userId,
        tenantId: tenantId
      },
      data: {
        ewelinkAccessToken: tokenData.access_token,
        ewelinkRefreshToken: tokenData.refresh_token,
        ewelinkUserId: tokenData.user?.userid || null
      }
    });
    
    // Log the OAuth connection
    await prisma.auditLog.create({
      data: {
        tenantUserId: userId,
        action: 'OAUTH_CONNECTED',
        resource: `tenant_user:${userId}`,
        details: JSON.stringify({ 
          ewelinkUserId: tokenData.user?.userid,
          tenantId 
        })
      }
    });
    
    // Redirect to tenant-specific success page
    res.redirect(`${config.frontendUrl}/oauth/success?tenant=${tenantId}`);
    
  } catch (error: any) {
    console.error('Tenant OAuth callback error:', error);
    res.redirect(`${config.frontendUrl}/oauth/error?error=callback_failed&tenant=${req.params.tenantId}`);
  }
});

// Check OAuth status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Extract user ID based on user type
    const userId = (req as any).user?.id || 
                   (req as any).globalAdmin?.id || 
                   (req as any).tenantAdmin?.id || 
                   (req as any).tenantUser?.id;
    
    let ewelinkAccessToken: string | null = null;
    let ewelinkUserId: string | null = null;
    let updatedAt: Date | null = null;
    
    // Fetch eWeLink data based on user type
    if ((req as any).globalAdmin?.id) {
      const admin = await prisma.globalAdmin.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true, ewelinkUserId: true, updatedAt: true }
      });
      ewelinkAccessToken = admin?.ewelinkAccessToken || null;
      ewelinkUserId = admin?.ewelinkUserId || null;
      updatedAt = admin?.updatedAt || null;
    } else if ((req as any).tenantAdmin?.id) {
      const admin = await prisma.tenantAdmin.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true, ewelinkUserId: true, updatedAt: true }
      });
      ewelinkAccessToken = admin?.ewelinkAccessToken || null;
      ewelinkUserId = admin?.ewelinkUserId || null;
      updatedAt = admin?.updatedAt || null;
    } else if ((req as any).tenantUser?.id) {
      const user = await prisma.tenantUser.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true, ewelinkUserId: true, updatedAt: true }
      });
      ewelinkAccessToken = user?.ewelinkAccessToken || null;
      ewelinkUserId = user?.ewelinkUserId || null;
      updatedAt = user?.updatedAt || null;
    } else if ((req as any).user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true, ewelinkUserId: true, updatedAt: true }
      });
      ewelinkAccessToken = user?.ewelinkAccessToken || null;
      ewelinkUserId = user?.ewelinkUserId || null;
      updatedAt = user?.updatedAt || null;
    }
    
    const isConnected = !!ewelinkAccessToken;
    
    res.json({
      connected: isConnected,
      ewelink_user_id: ewelinkUserId,
      last_updated: updatedAt
    });
    
  } catch (error: any) {
    console.error('OAuth status error:', error);
    res.status(500).json({ error: 'Failed to check OAuth status' });
  }
});

// Disconnect eWeLink account
router.post('/disconnect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        ewelinkAccessToken: null,
        ewelinkRefreshToken: null,
        ewelinkUserId: null
      }
    });
    
    res.json({ message: 'eWeLink account disconnected successfully' });
    
  } catch (error: any) {
    console.error('OAuth disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect eWeLink account' });
  }
});

// Refresh eWeLink token
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ewelinkRefreshToken: true }
    });
    
    if (!user?.ewelinkRefreshToken) {
      return res.status(400).json({ error: 'No refresh token available' });
    }
    
    const ewelinkService = new EWeLinkService();
    const tokenData = await ewelinkService.refreshAccessToken(user.ewelinkRefreshToken);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        ewelinkAccessToken: tokenData.access_token,
        ewelinkRefreshToken: tokenData.refresh_token
      }
    });
    
    res.json({ message: 'Token refreshed successfully' });
    
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export { router as oauthRoutes };
