import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  globalAdmin?: {
    id: string;
    email: string;
    role: 'global_admin';
  };
  tenantAdmin?: {
    id: string;
    email: string;
    tenantId: string;
    role: 'tenant_admin';
  };
  tenantUser?: {
    id: string;
    email: string;
    tenantId: string;
    role: 'tenant_user';
  };
}

// Legacy auth middleware (for backward compatibility)
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Global Admin authentication middleware
export const globalAdminAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    if (decoded.role !== 'global_admin') {
      return res.status(403).json({ error: 'Global admin access required' });
    }
    
    req.globalAdmin = {
      id: decoded.globalAdminId,
      email: decoded.email,
      role: 'global_admin'
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Global admin auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Tenant Admin authentication middleware
export const tenantAdminAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    if (decoded.role !== 'tenant_admin') {
      return res.status(403).json({ error: 'Tenant admin access required' });
    }
    
    req.tenantAdmin = {
      id: decoded.tenantAdminId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: 'tenant_admin'
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Tenant admin auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Tenant User authentication middleware
export const tenantUserAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    if (decoded.role !== 'tenant_user') {
      return res.status(403).json({ error: 'Tenant user access required' });
    }
    
    req.tenantUser = {
      id: decoded.tenantUserId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      role: 'tenant_user'
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Tenant user auth middleware error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// MCP endpoint authentication - validates tenant and user
export const mcpAuthMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.params;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID are required' });
    }

    // Handle Global Admin MCP access
    if (tenantId === 'global') {
      const globalAdmin = await prisma.globalAdmin.findUnique({
        where: { id: userId }
      });

      if (!globalAdmin) {
        return res.status(404).json({ error: 'Global admin not found' });
      }

      req.globalAdmin = {
        id: globalAdmin.id,
        email: globalAdmin.email,
        role: 'global_admin'
      };

      return next();
    }

    // Validate tenant exists and is approved
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Tenant is not approved' });
    }

    // Check if user is a Tenant Admin
    const tenantAdmin = await prisma.tenantAdmin.findUnique({
      where: { id: userId }
    });

    if (tenantAdmin && tenantAdmin.tenantId === tenantId) {
      if (tenantAdmin.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Tenant admin is not active' });
      }

      req.tenantAdmin = {
        id: tenantAdmin.id,
        email: tenantAdmin.email,
        tenantId: tenantAdmin.tenantId,
        role: 'tenant_admin'
      };

      return next();
    }

    // Check if user is a Tenant User
    const tenantUser = await prisma.tenantUser.findUnique({
      where: { id: userId }
    });

    if (tenantUser && tenantUser.tenantId === tenantId) {
      if (tenantUser.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Tenant user is not active' });
      }

      req.tenantUser = {
        id: tenantUser.id,
        email: tenantUser.email,
        tenantId: tenantUser.tenantId,
        role: 'tenant_user'
      };

      return next();
    }

    return res.status(404).json({ error: 'User not found in tenant' });

  } catch (error: any) {
    console.error('MCP auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Legacy admin middleware (for backward compatibility)
export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};
