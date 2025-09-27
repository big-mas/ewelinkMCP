import { PrismaClient, TenantUser, Tenant } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';

const prisma = new PrismaClient();

export interface TenantUserJWTPayload {
  tenantUserId: string;
  email: string;
  tenantId: string;
  role: 'tenant_user';
}

export interface TenantUserRegistrationData {
  email: string;
  name?: string;
  tenantDomain: string; // Users register by specifying tenant domain
}

export class TenantUserService {
  /**
   * Register a new tenant user
   */
  static async registerTenantUser(data: TenantUserRegistrationData): Promise<TenantUser> {
    // Find tenant by domain
    const tenant = await prisma.tenant.findUnique({
      where: { domain: data.tenantDomain }
    });

    if (!tenant) {
      throw new Error('Tenant not found. Please check the domain.');
    }

    if (tenant.status !== "APPROVED") {
      throw new Error('Tenant is not approved for new user registrations.');
    }

    // Check if user already exists in this tenant
    const existingUser = await prisma.tenantUser.findUnique({
      where: { 
        email_tenantId: {
          email: data.email,
          tenantId: tenant.id
        }
      }
    });

    if (existingUser) {
      throw new Error('User already exists in this tenant');
    }

    // Create tenant user (no password needed - OAuth only)
    const user = await prisma.tenantUser.create({
      data: {
        email: data.email,
        name: data.name,
        tenantId: tenant.id,
        status: "ACTIVE"
      }
    });

    // Log the registration
    await prisma.auditLog.create({
      data: {
        tenantUserId: user.id,
        action: 'TENANT_USER_REGISTERED',
        resource: `user:${user.id}`,
        details: JSON.stringify({ tenantDomain: data.tenantDomain })
      }
    });

    return user;
  }

  /**
   * Authenticate tenant user (OAuth flow completion)
   */
  static async authenticateWithOAuth(
    email: string, 
    tenantId: string,
    ewelinkAccessToken: string,
    ewelinkRefreshToken?: string,
    ewelinkUserId?: string
  ): Promise<{ user: TenantUser & { tenant: Tenant }; token: string }> {
    
    // Find user in tenant
    const user = await prisma.tenantUser.findUnique({
      where: { 
        email_tenantId: {
          email,
          tenantId
        }
      },
      include: { tenant: true }
    });

    if (!user) {
      throw new Error('User not found in tenant');
    }

    if (user.status !== "ACTIVE") {
      throw new Error('User account is not active');
    }

    if (user.tenant.status !== "APPROVED") {
      throw new Error('Tenant is not approved');
    }

    // Update user with OAuth tokens
    const updatedUser = await prisma.tenantUser.update({
      where: { id: user.id },
      data: {
        ewelinkAccessToken,
        ewelinkRefreshToken,
        ewelinkUserId,
        lastActive: new Date()
      },
      include: { tenant: true }
    });

    // Generate JWT token
    const payload: TenantUserJWTPayload = {
      tenantUserId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: 'tenant_user'
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return { user: updatedUser, token };
  }

  /**
   * Get tenant user profile
   */
  static async getProfile(tenantUserId: string): Promise<TenantUser & { tenant: Tenant }> {
    const user = await prisma.tenantUser.findUnique({
      where: { id: tenantUserId },
      include: { tenant: true }
    });

    if (!user) {
      throw new Error('Tenant user not found');
    }

    return user;
  }

  /**
   * Update tenant user eWeLink OAuth tokens
   */
  static async updateEWeLinkTokens(
    tenantUserId: string, 
    accessToken: string, 
    refreshToken?: string,
    ewelinkUserId?: string
  ): Promise<void> {
    await prisma.tenantUser.update({
      where: { id: tenantUserId },
      data: {
        ewelinkAccessToken: accessToken,
        ewelinkRefreshToken: refreshToken,
        ewelinkUserId,
        lastActive: new Date()
      }
    });
  }

  /**
   * Update MCP session ID
   */
  static async updateMCPSession(tenantUserId: string, sessionId: string): Promise<void> {
    await prisma.tenantUser.update({
      where: { id: tenantUserId },
      data: {
        mcpSessionId: sessionId,
        lastActive: new Date()
      }
    });
  }

  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<TenantUser | null> {
    return prisma.tenantUser.findUnique({
      where: { id }
    });
  }

  /**
   * Find user by email and tenant
   */
  static async findByEmailAndTenant(email: string, tenantId: string): Promise<TenantUser | null> {
    return prisma.tenantUser.findUnique({
      where: { 
        email_tenantId: {
          email,
          tenantId
        }
      }
    });
  }

  /**
   * Get available tenants for user registration
   */
  static async getAvailableTenants(): Promise<Array<{
    id: string;
    name: string;
    domain: string | null;
    createdAt: Date;
  }>> {
    return prisma.tenant.findMany({
      where: {
        status: "APPROVED",
        domain: { not: null } // Only tenants with domains can accept user registrations
      },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Generate MCP URL for user
   */
  static generateMCPUrl(tenantId: string, userId: string): string {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/mcp/${tenantId}/${userId}`;
  }
}
