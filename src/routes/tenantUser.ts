import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TenantUserService } from '../services/tenantUserService';
import { tenantUserAuthMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Get Available Tenants for Registration
router.get('/available-tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await TenantUserService.getAvailableTenants();

    res.json({
      tenants: tenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        createdAt: tenant.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Get available tenants error:', error);
    res.status(500).json({ error: 'Failed to get available tenants' });
  }
});

// Tenant User Registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('name').optional().isString(),
  body('tenantDomain').notEmpty().withMessage('Tenant domain is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const registrationData = req.body;

    const user = await TenantUserService.registerTenantUser(registrationData);

    const mcpUrl = TenantUserService.generateMCPUrl(user.tenantId, user.id);

    res.status(201).json({
      message: 'User registration successful. Please complete eWeLink OAuth to activate your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        tenantId: user.tenantId,
        mcpUrl
      }
    });

  } catch (error: any) {
    console.error('Tenant user registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Tenant User Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await TenantUserService.loginTenantUser(email, password);

    res.json({
      message: 'Login successful',
      token: result.token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: 'tenant_user',
        status: result.user.status,
        tenantId: result.user.tenantId,
        tenant: {
          id: result.user.tenant.id,
          name: result.user.tenant.name,
          domain: result.user.tenant.domain,
          status: result.user.tenant.status
        },
        hasEWeLinkAuth: !!result.user.ewelinkAccessToken
      }
    });

  } catch (error: any) {
    console.error('Tenant user login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Get Tenant User Profile
router.get('/profile', tenantUserAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantUserId = (req as any).tenantUser?.id;

    const user = await TenantUserService.getProfile(tenantUserId);

    const mcpUrl = TenantUserService.generateMCPUrl(user.tenantId, user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'tenant_user',
        status: user.status,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        hasEWeLinkAuth: !!user.ewelinkAccessToken,
        mcpUrl,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          domain: user.tenant.domain,
          status: user.tenant.status
        }
      }
    });

  } catch (error: any) {
    console.error('Get tenant user profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get MCP URL for Tenant User
router.get('/mcp-url', tenantUserAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantUserId = (req as any).tenantUser?.id;
    const tenantId = (req as any).tenantUser?.tenantId;
    
    const mcpUrl = TenantUserService.generateMCPUrl(tenantId, tenantUserId);

    res.json({
      mcpUrl,
      sessionId: null, // Will be generated when MCP connection is established
      userType: 'tenant_user'
    });

  } catch (error: any) {
    console.error('Get MCP URL error:', error);
    res.status(500).json({ error: 'Failed to generate MCP URL' });
  }
});

// Update Profile
router.put('/profile', tenantUserAuthMiddleware, [
  body('name').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantUserId = (req as any).tenantUser?.id;
    const { name } = req.body;

    // Update user profile
    const updatedUser = await prisma.tenantUser.update({
      where: { id: tenantUserId },
      data: { name },
      include: { tenant: true }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        status: updatedUser.status
      }
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export { router as tenantUserRoutes };
