import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { GlobalAdminService } from '../services/globalAdminService';
import { globalAdminAuthMiddleware } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const router = Router();

// Global Admin Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    logger.info('Global Admin login attempt', { email: req.body.email });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Global Admin login validation failed', { errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { admin, token } = await GlobalAdminService.authenticate(email, password);
    logger.info('Global Admin login successful', { adminId: admin.id, email: admin.email });

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
    
    res.json(response);

  } catch (error: any) {
    logger.error('Global admin login failed', { error: error.message, email: req.body.email });
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
    logger.error('Create tenant failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to create tenant' });
  }
});

// Get System Stats
router.get('/stats', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const [totalTenants, activeTenants, pendingTenants, totalUsers, activeUsers] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'APPROVED' } }),
      prisma.tenant.count({ where: { status: 'PENDING' } }),
      Promise.all([
        prisma.globalAdmin.count(),
        prisma.tenantAdmin.count(),
        prisma.tenantUser.count()
      ]).then(counts => counts.reduce((a, b) => a + b, 0)),
      Promise.all([
        prisma.globalAdmin.count({ where: { status: 'ACTIVE' } }),
        prisma.tenantAdmin.count({ where: { status: 'ACTIVE' } }),
        prisma.tenantUser.count({ where: { status: 'ACTIVE' } })
      ]).then(counts => counts.reduce((a, b) => a + b, 0))
    ]);

    res.json({
      totalTenants,
      activeTenants,
      pendingTenants,
      totalUsers,
      activeUsers,
      systemStatus: 'Healthy'
    });
  } catch (error: any) {
    logger.error('Get stats failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get system stats' });
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
    logger.error('Get tenants failed', { error: error.message });
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
    logger.error('Approve tenant failed', { error: error.message, tenantId: req.params.id });
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
    logger.error('Suspend tenant failed', { error: error.message, tenantId: req.params.id });
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
    logger.error('Pause tenant failed', { error: error.message, tenantId: req.params.id });
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
    logger.error('Resume tenant failed', { error: error.message, tenantId: req.params.id });
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
    logger.error('Get global admin profile failed', { error: error.message });
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
    logger.error('Get tenant OAuth callback URL failed', { error: error.message });
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
    logger.error('Get all users failed', { error: error.message });
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user statistics
router.get('/users/stats', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const stats = await GlobalAdminService.getUserStats();

    res.json(stats);

  } catch (error: any) {
    logger.error('Get user stats failed', { error: error.message });
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
    logger.error('Get user by ID failed', { error: error.message, userId: req.params.id });
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
    logger.error('Update user status failed', { error: error.message, userId: req.params.id });
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
    logger.error('Delete user failed', { error: error.message, userId: req.params.id });
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
    logger.error('Get MCP URL failed', { error: error.message });
    res.status(500).json({ error: 'Failed to generate MCP URL' });
  }
});

// Get All Users (Cross-Tenant)
router.get('/users', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const role = req.query.role as string || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Get all user types based on role filter
    let users: any[] = [];
    let totalCount = 0;

    if (!role || role === 'global_admin') {
      const globalAdmins = await prisma.globalAdmin.findMany({
        where,
        skip: !role ? skip : 0,
        take: !role ? limit : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          lastActive: true
        },
        orderBy: { createdAt: 'desc' }
      });
      users.push(...globalAdmins.map(u => ({ ...u, role: 'Global Admin', tenantName: 'System' })));
    }

    if (!role || role === 'tenant_admin') {
      const tenantAdmins = await prisma.tenantAdmin.findMany({
        where,
        skip: !role ? 0 : skip,
        take: !role ? undefined : limit,
        include: {
          tenant: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      users.push(...tenantAdmins.map(u => ({ 
        id: u.id, 
        email: u.email, 
        name: u.name, 
        status: u.status, 
        createdAt: u.createdAt, 
        lastActive: u.lastActive,
        role: 'Tenant Admin', 
        tenantName: u.tenant.name 
      })));
    }

    if (!role || role === 'tenant_user') {
      const tenantUsers = await prisma.tenantUser.findMany({
        where,
        skip: !role ? 0 : skip,
        take: !role ? undefined : limit,
        include: {
          tenant: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      users.push(...tenantUsers.map(u => ({ 
        id: u.id, 
        email: u.email, 
        name: u.name, 
        status: u.status, 
        createdAt: u.createdAt, 
        lastActive: u.lastActive,
        role: 'Tenant User', 
        tenantName: u.tenant.name 
      })));
    }

    // Sort by creation date and paginate if no role filter
    if (!role) {
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      users = users.slice(skip, skip + limit);
    }

    // Get total counts
    const [globalAdminCount, tenantAdminCount, tenantUserCount] = await Promise.all([
      !role || role === 'global_admin' ? prisma.globalAdmin.count({ where }) : Promise.resolve(0),
      !role || role === 'tenant_admin' ? prisma.tenantAdmin.count({ where }) : Promise.resolve(0),
      !role || role === 'tenant_user' ? prisma.tenantUser.count({ where }) : Promise.resolve(0)
    ]);

    totalCount = globalAdminCount + tenantAdminCount + tenantUserCount;

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        globalAdmins: globalAdminCount,
        tenantAdmins: tenantAdminCount,
        tenantUsers: tenantUserCount,
        total: totalCount
      }
    });

  } catch (error: any) {
    logger.error('Get all users failed', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get User Details
router.get('/users/:id', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userType = req.query.type as string; // global_admin, tenant_admin, tenant_user

    let user: any = null;

    if (userType === 'global_admin') {
      user = await prisma.globalAdmin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastActive: true,
          ewelinkUserId: true
        }
      });
      if (user) user.role = 'Global Admin';
    } else if (userType === 'tenant_admin') {
      user = await prisma.tenantAdmin.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            select: { id: true, name: true, domain: true, status: true }
          }
        }
      });
      if (user) user.role = 'Tenant Admin';
    } else if (userType === 'tenant_user') {
      user = await prisma.tenantUser.findUnique({
        where: { id: userId },
        include: {
          tenant: {
            select: { id: true, name: true, domain: true, status: true }
          }
        }
      });
      if (user) user.role = 'Tenant User';
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error: any) {
    logger.error('Get user details failed', { error: error.message, userId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Suspend User
router.put('/users/:id/suspend', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userType = req.body.type as string;

    let user: any = null;

    if (userType === 'global_admin') {
      user = await prisma.globalAdmin.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' }
      });
    } else if (userType === 'tenant_admin') {
      user = await prisma.tenantAdmin.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' }
      });
    } else if (userType === 'tenant_user') {
      user = await prisma.tenantUser.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User suspended', { userId, userType, suspendedBy: (req as any).globalAdmin?.id });

    res.json({
      message: 'User suspended successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error: any) {
    logger.error('Suspend user failed', { error: error.message, userId: req.params.id });
    res.status(400).json({ error: error.message || 'Failed to suspend user' });
  }
});

// Activate User
router.put('/users/:id/activate', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userType = req.body.type as string;

    let user: any = null;

    if (userType === 'global_admin') {
      user = await prisma.globalAdmin.update({
        where: { id: userId },
        data: { status: 'ACTIVE' }
      });
    } else if (userType === 'tenant_admin') {
      user = await prisma.tenantAdmin.update({
        where: { id: userId },
        data: { status: 'ACTIVE' }
      });
    } else if (userType === 'tenant_user') {
      user = await prisma.tenantUser.update({
        where: { id: userId },
        data: { status: 'ACTIVE' }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User activated', { userId, userType, activatedBy: (req as any).globalAdmin?.id });

    res.json({
      message: 'User activated successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error: any) {
    logger.error('Activate user failed', { error: error.message, userId: req.params.id });
    res.status(400).json({ error: error.message || 'Failed to activate user' });
  }
});

// Delete User
router.delete('/users/:id', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userType = req.body.type as string;

    // Prevent deleting self
    if (userType === 'global_admin' && userId === (req as any).globalAdmin?.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    let user: any = null;

    if (userType === 'global_admin') {
      // Check if it's the last global admin
      const count = await prisma.globalAdmin.count();
      if (count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last global admin' });
      }
      user = await prisma.globalAdmin.delete({
        where: { id: userId }
      });
    } else if (userType === 'tenant_admin') {
      user = await prisma.tenantAdmin.update({
        where: { id: userId },
        data: { status: 'DELETED' }
      });
    } else if (userType === 'tenant_user') {
      user = await prisma.tenantUser.update({
        where: { id: userId },
        data: { status: 'DELETED' }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User deleted', { userId, userType, deletedBy: (req as any).globalAdmin?.id });

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    logger.error('Delete user failed', { error: error.message, userId: req.params.id });
    res.status(400).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get System Settings
router.get('/settings', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // Return current system settings
    // In a real implementation, these would be stored in a Settings table
    const settings = {
      maintenanceMode: false,
      autoApproveTenants: false,
      jwtExpiryDays: 7,
      maxTenantsPerDomain: 1,
      enableEmailNotifications: false,
      auditLogRetentionDays: 90,
      maxUsersPerTenant: 100,
      enableRateLimiting: process.env.NODE_ENV === 'production',
      sessionTimeoutMinutes: 30
    };

    res.json({ settings });

  } catch (error: any) {
    logger.error('Get settings failed', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update System Settings
router.put('/settings', globalAdminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const globalAdminId = (req as any).globalAdmin?.id;
    const updates = req.body;

    // Validate settings
    const allowedSettings = [
      'maintenanceMode',
      'autoApproveTenants',
      'jwtExpiryDays',
      'maxTenantsPerDomain',
      'enableEmailNotifications',
      'auditLogRetentionDays',
      'maxUsersPerTenant',
      'enableRateLimiting',
      'sessionTimeoutMinutes'
    ];

    const invalidSettings = Object.keys(updates).filter(key => !allowedSettings.includes(key));
    if (invalidSettings.length > 0) {
      return res.status(400).json({ 
        error: `Invalid settings: ${invalidSettings.join(', ')}` 
      });
    }

    // In a real implementation, save to Settings table
    // For now, we'll just validate and return success
    logger.info('System settings updated', { 
      globalAdminId, 
      updates: Object.keys(updates),
      timestamp: new Date()
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        globalAdminId,
        action: 'UPDATE_SETTINGS',
        resource: 'SYSTEM_SETTINGS',
        details: JSON.stringify(updates)
      }
    });

    res.json({
      message: 'Settings updated successfully',
      settings: updates
    });

  } catch (error: any) {
    logger.error('Update settings failed', { error: error.message });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export { router as globalAdminRoutes };
