import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { EWeLinkService } from '../services/ewelinkService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get user's eWeLink devices
router.get('/devices', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Extract user ID and tenant ID based on user type
    const userId = (req as any).user?.id || 
                   (req as any).globalAdmin?.id || 
                   (req as any).tenantAdmin?.id || 
                   (req as any).tenantUser?.id;
    
    const tenantId = (req as any).tenantAdmin?.tenantId || 
                     (req as any).tenantUser?.tenantId;
    
    let ewelinkAccessToken: string | null = null;
    let userTenantId: string | null = tenantId || null;
    
    // Fetch eWeLink access token based on user type
    if ((req as any).globalAdmin?.id) {
      const admin = await prisma.globalAdmin.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true }
      });
      ewelinkAccessToken = admin?.ewelinkAccessToken || null;
    } else if ((req as any).tenantAdmin?.id) {
      const admin = await prisma.tenantAdmin.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true }
      });
      ewelinkAccessToken = admin?.ewelinkAccessToken || null;
    } else if ((req as any).tenantUser?.id) {
      const user = await prisma.tenantUser.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true }
      });
      ewelinkAccessToken = user?.ewelinkAccessToken || null;
    } else if ((req as any).user?.id) {
      // Legacy user support
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { ewelinkAccessToken: true }
      });
      ewelinkAccessToken = user?.ewelinkAccessToken || null;
      
      // Try to find default tenant for legacy users
      const defaultTenant = await prisma.tenant.findFirst({
        where: { name: 'Default Tenant' }
      });
      
      if (!defaultTenant) {
        return res.status(400).json({ 
          error: 'No tenant found for user. Please complete migration.',
          code: 'TENANT_NOT_FOUND'
        });
      }
      
      userTenantId = defaultTenant.id;
    }
    
    if (!ewelinkAccessToken) {
      return res.status(400).json({ 
        error: 'eWeLink account not connected',
        code: 'EWELINK_NOT_CONNECTED'
      });
    }
    
    const ewelinkService = new EWeLinkService();
    ewelinkService.setAccessToken(ewelinkAccessToken);
    
    const devices = await ewelinkService.getDevices();
    
    // Update local device cache
    for (const device of devices) {
      await prisma.device.upsert({
        where: { 
          deviceId_tenantId: {
            deviceId: device.deviceid,
            tenantId: userTenantId
          }
        },
        update: {
          name: device.name,
          type: device.type,
          model: device.model || '',
          online: device.online,
          params: JSON.stringify(device.params),
          capabilities: JSON.stringify(device.capabilities || [])
        },
        create: {
          deviceId: device.deviceid,
          name: device.name,
          type: device.type,
          model: device.model || '',
          online: device.online,
          params: JSON.stringify(device.params),
          capabilities: JSON.stringify(device.capabilities || []),
          tenantId: userTenantId
        }
      });
    }
    
    res.json({ devices });
    
  } catch (error: any) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get specific device
router.get('/devices/:deviceId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deviceId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        ewelinkAccessToken: true
      }
    });

    // For legacy users, we need to find their migrated tenant
    // This is a temporary solution during migration period
    let userTenantId: string;
    
    // Try to find default tenant for legacy users
    const defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });
    
    if (!defaultTenant) {
      return res.status(400).json({ 
        error: 'No tenant found for user. Please complete migration.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    userTenantId = defaultTenant.id;
    
    if (!user?.ewelinkAccessToken) {
      return res.status(400).json({ 
        error: 'eWeLink account not connected',
        code: 'EWELINK_NOT_CONNECTED'
      });
    }
    
    const ewelinkService = new EWeLinkService();
    ewelinkService.setAccessToken(user.ewelinkAccessToken);
    
    const device = await ewelinkService.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json({ device });
    
  } catch (error: any) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Control device
router.post('/devices/:deviceId/control', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deviceId } = req.params;
    const { params } = req.body;
    
    if (!params || typeof params !== 'object') {
      return res.status(400).json({ error: 'Invalid control parameters' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        ewelinkAccessToken: true
      }
    });

    // For legacy users, we need to find their migrated tenant
    // This is a temporary solution during migration period
    let userTenantId: string;
    
    // Try to find default tenant for legacy users
    const defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });
    
    if (!defaultTenant) {
      return res.status(400).json({ 
        error: 'No tenant found for user. Please complete migration.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    userTenantId = defaultTenant.id;
    
    if (!user?.ewelinkAccessToken) {
      return res.status(400).json({ 
        error: 'eWeLink account not connected',
        code: 'EWELINK_NOT_CONNECTED'
      });
    }
    
    const ewelinkService = new EWeLinkService();
    ewelinkService.setAccessToken(user.ewelinkAccessToken);
    
    const success = await ewelinkService.controlDevice({ deviceId, params });
    
    if (success) {
      // Log the control action
      await prisma.auditLog.create({
        data: {
          legacyUserId: userId, // For backward compatibility
          action: 'DEVICE_CONTROL',
          resource: `device:${deviceId}`,
          details: JSON.stringify({ params })
        }
      });
      
      res.json({ 
        success: true, 
        message: 'Device controlled successfully',
        deviceId,
        params
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to control device' 
      });
    }
    
  } catch (error: any) {
    console.error('Control device error:', error);
    res.status(500).json({ error: 'Failed to control device' });
  }
});

// Get device status
router.get('/devices/:deviceId/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deviceId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        ewelinkAccessToken: true
      }
    });

    // For legacy users, we need to find their migrated tenant
    // This is a temporary solution during migration period
    let userTenantId: string;
    
    // Try to find default tenant for legacy users
    const defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });
    
    if (!defaultTenant) {
      return res.status(400).json({ 
        error: 'No tenant found for user. Please complete migration.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    userTenantId = defaultTenant.id;
    
    if (!user?.ewelinkAccessToken) {
      return res.status(400).json({ 
        error: 'eWeLink account not connected',
        code: 'EWELINK_NOT_CONNECTED'
      });
    }
    
    const ewelinkService = new EWeLinkService();
    ewelinkService.setAccessToken(user.ewelinkAccessToken);
    
    const status = await ewelinkService.getDeviceStatus(deviceId);
    
    if (!status) {
      return res.status(404).json({ error: 'Device status not found' });
    }
    
    res.json({ 
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Get device status error:', error);
    res.status(500).json({ error: 'Failed to get device status' });
  }
});

// Get user info from eWeLink
router.get('/user', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        ewelinkAccessToken: true
      }
    });

    // For legacy users, we need to find their migrated tenant
    // This is a temporary solution during migration period
    let userTenantId: string;
    
    // Try to find default tenant for legacy users
    const defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });
    
    if (!defaultTenant) {
      return res.status(400).json({ 
        error: 'No tenant found for user. Please complete migration.',
        code: 'TENANT_NOT_FOUND'
      });
    }
    
    userTenantId = defaultTenant.id;
    
    if (!user?.ewelinkAccessToken) {
      return res.status(400).json({ 
        error: 'eWeLink account not connected',
        code: 'EWELINK_NOT_CONNECTED'
      });
    }
    
    const ewelinkService = new EWeLinkService();
    ewelinkService.setAccessToken(user.ewelinkAccessToken);
    
    const userInfo = await ewelinkService.getUserInfo();
    
    res.json({ userInfo });
    
  } catch (error: any) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

export { router as tenantRoutes };
