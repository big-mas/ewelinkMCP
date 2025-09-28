import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { GlobalAdminService } from '../services/globalAdminService';
import { globalAdminAuthMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Global Admin Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    console.log('🚀 Global Admin login route hit');
    console.log('📧 Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('✅ Validation passed, attempting authentication...');

    const { admin, token } = await GlobalAdminService.authenticate(email, password);
    console.log('🎉 Authentication successful, preparing response...');

    const response = {
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'global_admin',
        createdAt: admin.createdAt
      }
    };
    
    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error: any) {
    console.error('Global admin login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Create Tenant
router.post('/tenants', globalAdminAuthMiddleware, [
  body('name').notEmpty().withMessage('Tenant name is required'),
  body('domain').optional().isString(),
  body('ewelinkClientId').optional().isString(),
  body('ewelinkClientSecret').optional().isString(),
  body('ewelinkRedirectUri').optional().isURL()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const globalAdminId = (req as any).globalAdmin?.id;
    const tenantData = req.body;

    const tenant = await GlobalAdminService.createTenant(globalAdminId, tenantData);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        status: tenant.status,
        createdAt: tenant.createdAt,
        hasEWeLinkConfig: !!(tenant.ewelinkClientId && tenant.ewelinkClientSecret)
      }
    });

  } catch (error: any) {
    console.error('Create tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to create tenant' });
  }
});

// Get All Tenants
router.get('/tenants', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenants = await GlobalAdminService.getAllTenants();

    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        // Get counts for admins and users
        const adminCount = await prisma.tenantAdmin.count({
          where: { tenantId: tenant.id }
        });
        
        const userCount = await prisma.tenantUser.count({
          where: { tenantId: tenant.id }
        });

        return {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          status: tenant.status,
          createdAt: tenant.createdAt,
          approvedAt: tenant.approvedAt,
          adminCount,
          userCount,
          hasEWeLinkConfig: !!(tenant.ewelinkClientId && tenant.ewelinkClientSecret)
        };
      })
    );

    res.json({ tenants: tenantsWithCounts });

  } catch (error: any) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Approve Tenant
router.put('/tenants/:id/approve', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const tenantId = req.params.id;

    const tenant = await GlobalAdminService.approveTenant(globalAdminId, tenantId);

    res.json({
      message: 'Tenant approved successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        approvedAt: tenant.approvedAt
      }
    });

  } catch (error: any) {
    console.error('Approve tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to approve tenant' });
  }
});

// Suspend Tenant
router.put('/tenants/:id/suspend', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const tenantId = req.params.id;

    const tenant = await GlobalAdminService.suspendTenant(globalAdminId, tenantId);

    res.json({
      message: 'Tenant suspended successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status
      }
    });

  } catch (error: any) {
    console.error('Suspend tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to suspend tenant' });
  }
});

// Pause Tenant
router.put('/tenants/:id/pause', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const tenantId = req.params.id;

    const tenant = await GlobalAdminService.pauseTenant(globalAdminId, tenantId);

    res.json({
      message: 'Tenant paused successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status
      }
    });

  } catch (error: any) {
    console.error('Pause tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to pause tenant' });
  }
});

// Resume Tenant
router.put('/tenants/:id/resume', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const tenantId = req.params.id;

    const tenant = await GlobalAdminService.resumeTenant(globalAdminId, tenantId);

    res.json({
      message: 'Tenant resumed successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status
      }
    });

  } catch (error: any) {
    console.error('Resume tenant error:', error);
    res.status(400).json({ error: error.message || 'Failed to resume tenant' });
  }
});

// Get Global Admin Profile
router.get('/profile', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const admin = await GlobalAdminService.getById(globalAdminId);

    if (!admin) {
      return res.status(404).json({ error: 'Global admin not found' });
    }

    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'global_admin',
        createdAt: admin.createdAt,
        lastActive: admin.lastActive,
        hasEWeLinkAuth: !!admin.ewelinkAccessToken
      }
    });

  } catch (error: any) {
    console.error('Get global admin profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get tenant OAuth callback URL
router.get('/tenants/:id/oauth-callback-url', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, domain: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Generate tenant-specific callback URL
    const callbackUrl = `${baseUrl}/api/oauth/callback/${tenantId}`;
    
    // Generate a friendly slug from tenant name or domain
    const slug = (tenant.domain || tenant.name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const friendlyCallbackUrl = `${baseUrl}/api/oauth/callback/${slug}`;

    res.json({
      tenantId,
      tenantName: tenant.name,
      callbackUrl,
      friendlyCallbackUrl,
      instructions: {
        title: 'eWeLink OAuth App Configuration',
        steps: [
          '1. Go to https://dev.ewelink.cc/oauth-apps',
          '2. Create a new OAuth app or edit existing one',
          '3. Set the Redirect URI to the callback URL below',
          '4. Copy the Client ID and Client Secret to your tenant configuration'
        ]
      }
    });

  } catch (error: any) {
    console.error('Get tenant OAuth callback URL error:', error);
    res.status(500).json({ error: 'Failed to generate callback URL' });
  }
});

// Get all users
router.get('/users', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const users = await GlobalAdminService.getAllUsers(globalAdminId);

    res.json({
      users,
      total: users.length
    });

  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user statistics
router.get('/users/stats', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await GlobalAdminService.getUserStats();

    res.json(stats);

  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Get user by ID
router.get('/users/:id/:type', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, type } = req.params;
    const user = await GlobalAdminService.getUserById(id, type);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error: any) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user status
router.put('/users/:id/:type/status', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const { id, type } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedUser = await GlobalAdminService.updateUserStatus(globalAdminId, id, type, status);

    res.json({
      message: 'User status updated successfully',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(400).json({ error: error.message || 'Failed to update user status' });
  }
});

// Delete user
router.delete('/users/:id/:type', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const { id, type } = req.params;

    await GlobalAdminService.deleteUser(globalAdminId, id, type);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get MCP URL for Global Admin
router.get('/mcp-url', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    // Global admins use a special tenant ID
    const mcpUrl = `${baseUrl}/mcp/global/${globalAdminId}`;

    res.json({
      mcpUrl,
      sessionId: null, // Will be generated when MCP connection is established
      userType: 'global_admin'
    });

  } catch (error: any) {
    console.error('Get MCP URL error:', error);
    res.status(500).json({ error: 'Failed to generate MCP URL' });
  }
});

export { router as globalAdminRoutes };
