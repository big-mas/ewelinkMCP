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

// Handle eWeLink OAuth callback
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

// Check OAuth status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ewelinkAccessToken: true,
        ewelinkUserId: true,
        updatedAt: true
      }
    });
    
    const isConnected = !!user?.ewelinkAccessToken;
    
    res.json({
      connected: isConnected,
      ewelink_user_id: user?.ewelinkUserId || null,
      last_updated: user?.updatedAt || null
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
