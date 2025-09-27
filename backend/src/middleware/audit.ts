import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const auditMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Skip audit for health checks and non-authenticated routes
  if (req.path === '/health' || req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/register')) {
    return next();
  }
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to capture response
  res.end = function(chunk?: any, encoding?: any): any {
    // Only audit successful requests with authenticated users
    if (req.user && res.statusCode < 400) {
      // Async audit logging (don't block response)
      setImmediate(async () => {
        try {
          const action = `${req.method} ${req.path}`;
          const resource = req.path;
          const details = {
            method: req.method,
            path: req.path,
            query: req.query,
            statusCode: res.statusCode,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
          };
          
          await prisma.auditLog.create({
            data: {
              userId: req.user!.id,
              action,
              resource,
              details: JSON.stringify(details)
            }
          });
        } catch (error) {
          console.error('Audit logging error:', error);
          // Don't throw - audit failures shouldn't break the application
        }
      });
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};
