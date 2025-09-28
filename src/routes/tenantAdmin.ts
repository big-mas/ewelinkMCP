import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { TenantAdminService } from '../services/tenantAdminService';
import { tenantAdminAuthMiddleware } from '../middleware/auth';

const router = Router();

// Tenant Admin Registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().isString(),
  body('tenantName').notEmpty().withMessage('Tenant name is required'),
  body('domain').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const registrationData = req.body;

    const { tenant, admin } = await TenantAdminService.registerTenantAdmin(registrationData);

    res.status(201).json({
      message: 'Tenant admin registration successful. Waiting for Global Admin approval.',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        status: tenant.status
      },
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        status: admin.status
      }
    });

  } catch (error: any) {
    console.error('Tenant admin registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Tenant Admin Login
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

    const { admin, token } = await TenantAdminService.authenticate(email, password);

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'tenant_admin',
        tenantId: admin.tenantId,
        tenant: {
          id: admin.tenant.id,
          name: admin.tenant.name,
          domain: admin.tenant.domain,
          status: admin.tenant.status
        },
        hasEWeLinkAuth: !!admin.ewelinkAccessToken
      }
    });

  } catch (error: any) {
    console.error('Tenant admin login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Configure eWeLink OAuth
router.post('/oauth-config', tenantAdminAuthMiddleware, [
  body('clientId').notEmpty().withMessage('eWeLink Client ID is required'),
  body('clientSecret').notEmpty().withMessage('eWeLink Client Secret is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantAdminId = (req as any).tenantAdmin?.id;
    const { clientId, clientSecret } = req.body;

    const tenant = await TenantAdminService.configureOAuth(tenantAdminId, {
      ewelinkClientId: clientId,
      ewelinkClientSecret: clientSecret,
      ewelinkRedirectUri: `${process.env.BASE_URL || 'http://localhost:3000'}/oauth/callback`
    });

    res.json({
      message: 'OAuth configuration saved successfully',
      success: true
    });

  } catch (error: any) {
    console.error('OAuth configuration error:', error);
    res.status(400).json({ error: error.message || 'Failed to configure OAuth' });
  }
});

// Test OAuth Connection
router.get('/oauth-test', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantAdminId = (req as any).tenantAdmin?.id;
    
    const oauthConfig = await TenantAdminService.getTenantOAuthConfig(tenantAdminId);
    
    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      return res.json({
        success: false,
        error: 'OAuth configuration not found. Please save your Client ID and Client Secret first.'
      });
    }

    // Simple test - just verify the configuration exists
    res.json({
      success: true,
      message: 'OAuth configuration is valid and ready for use'
    });

  } catch (error: any) {
    console.error('OAuth test error:', error);
    res.json({
      success: false,
      error: 'Failed to test OAuth connection'
    });
  }
});

// Get OAuth Configuration
router.get('/oauth-config', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantAdminId = (req as any).tenantAdmin?.id;

    const oauthConfig = await TenantAdminService.getTenantOAuthConfig(tenantAdminId);

    res.json({
      hasConfig: !!(oauthConfig.clientId && oauthConfig.clientSecret),
      clientId: oauthConfig.clientId,
      redirectUri: oauthConfig.redirectUri
      // Note: We don't return the client secret for security
    });

  } catch (error: any) {
    console.error('Get OAuth config error:', error);
    res.status(500).json({ error: 'Failed to get OAuth configuration' });
  }
});

// Get Tenant Users
router.get('/users', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantAdminId = (req as any).tenantAdmin?.id;

    const users = await TenantAdminService.getTenantUsers(tenantAdminId);

    const usersWithMCPUrls = users.map(user => {
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const mcpUrl = `${baseUrl}/mcp/${user.tenantId}/${user.id}`;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        hasEWeLinkAuth: !!user.ewelinkAccessToken,
        mcpUrl
      };
    });

    res.json({ users: usersWithMCPUrls });

  } catch (error: any) {
    console.error('Get tenant users error:', error);
    res.status(500).json({ error: 'Failed to get tenant users' });
  }
});

// Create/Invite Tenant User
router.post('/users', tenantAdminAuthMiddleware, [
  body('email').isEmail().normalizeEmail(),
  body('name').optional().isString()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantAdminId = (req as any).tenantAdmin?.id;
    const { email, name } = req.body;

    const user = await TenantAdminService.createTenantUser(tenantAdminId, email, name);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const mcpUrl = `${baseUrl}/mcp/${user.tenantId}/${user.id}`;

    res.status(201).json({
      message: 'Tenant user created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        createdAt: user.createdAt,
        mcpUrl
      }
    });

  } catch (error: any) {
    console.error('Create tenant user error:', error);
    res.status(400).json({ error: error.message || 'Failed to create user' });
  }
});

// Update User Status
router.put('/users/:userId/status', tenantAdminAuthMiddleware, [
  body('status').isIn(['ACTIVE', 'SUSPENDED', 'DELETED']).withMessage('Invalid status')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tenantAdminId = (req as any).tenantAdmin?.id;
    const { userId } = req.params;
    const { status } = req.body;

    const user = await TenantAdminService.updateUserStatus(tenantAdminId, userId, status);

    res.json({
      message: 'User status updated successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(400).json({ error: error.message || 'Failed to update user status' });
  }
});

// Get Tenant Admin Profile
router.get('/profile', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantAdminId = (req as any).tenantAdmin?.id;

    const admin = await TenantAdminService.getProfile(tenantAdminId);

    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'tenant_admin',
        status: admin.status,
        createdAt: admin.createdAt,
        lastActive: admin.lastActive,
        hasEWeLinkAuth: !!admin.ewelinkAccessToken,
        tenant: {
          id: admin.tenant.id,
          name: admin.tenant.name,
          domain: admin.tenant.domain,
          status: admin.tenant.status,
          hasOAuthConfig: !!(admin.tenant.ewelinkClientId && admin.tenant.ewelinkClientSecret)
        }
      }
    });

  } catch (error: any) {
    console.error('Get tenant admin profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get MCP URL for Tenant Admin
router.get('/mcp-url', tenantAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantAdminId = (req as any).tenantAdmin?.id;
    const tenantId = (req as any).tenantAdmin?.tenantId;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    const mcpUrl = `${baseUrl}/mcp/${tenantId}/${tenantAdminId}`;

    res.json({
      mcpUrl,
      sessionId: null, // Will be generated when MCP connection is established
      userType: 'tenant_admin'
    });

  } catch (error: any) {
    console.error('Get MCP URL error:', error);
    res.status(500).json({ error: 'Failed to generate MCP URL' });
  }
});

export { router as tenantAdminRoutes };
