import { PrismaClient, GlobalAdmin, Tenant } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { hashPassword, verifyPassword, encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

export interface GlobalAdminJWTPayload {
  globalAdminId: string;
  email: string;
  role: 'global_admin';
}

export interface CreateTenantData {
  name: string;
  domain?: string;
  ewelinkClientId?: string;
  ewelinkClientSecret?: string;
  ewelinkRedirectUri?: string;
}

export class GlobalAdminService {
  /**
   * Create a new global admin
   */
  static async createGlobalAdmin(email: string, password: string, name?: string): Promise<GlobalAdmin> {
    const existingAdmin = await prisma.globalAdmin.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      throw new Error('Global admin with this email already exists');
    }

    const hashedPassword = await hashPassword(password);

    return prisma.globalAdmin.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });
  }

  /**
   * Authenticate global admin
   */
  static async authenticate(email: string, password: string): Promise<{ admin: GlobalAdmin; token: string }> {
    console.log('🔍 Authenticating Global Admin:', email);
    
    const admin = await prisma.globalAdmin.findUnique({
      where: { email }
    });

    if (!admin) {
      console.log('❌ Admin not found for email:', email);
      throw new Error('Invalid email or password');
    }

    console.log('✅ Admin found:', admin.email);
    console.log('🔑 Verifying password...');
    
    const isValidPassword = await verifyPassword(password, admin.password);
    console.log('🔑 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      throw new Error('Invalid email or password');
    }

    console.log('🎉 Password verification successful!');

    // Update last active
    console.log('📅 Updating last active timestamp...');
    await prisma.globalAdmin.update({
      where: { id: admin.id },
      data: { lastActive: new Date() }
    });

    // Generate JWT token
    console.log('🔑 Generating JWT token...');
    console.log('🔧 JWT Secret available:', !!config.jwtSecret);
    
    const payload: GlobalAdminJWTPayload = {
      globalAdminId: admin.id,
      email: admin.email,
      role: 'global_admin'
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
    console.log('✅ JWT token generated successfully');

    return { admin, token };
  }

  /**
   * Create a new tenant
   */
  static async createTenant(globalAdminId: string, tenantData: CreateTenantData): Promise<Tenant> {
    // Verify global admin exists
    const globalAdmin = await prisma.globalAdmin.findUnique({
      where: { id: globalAdminId }
    });

    if (!globalAdmin) {
      throw new Error('Global admin not found');
    }

    // Check if domain is already taken
    if (tenantData.domain) {
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: tenantData.domain }
      });

      if (existingTenant) {
        throw new Error('Domain already taken by another tenant');
      }
    }

    // Encrypt eWeLink client secret if provided
    let encryptedClientSecret: string | undefined;
    if (tenantData.ewelinkClientSecret) {
      encryptedClientSecret = encrypt(tenantData.ewelinkClientSecret);
    }

    // Create tenant with APPROVED status (Global Admin creates directly)
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantData.name,
        domain: tenantData.domain,
        status: "APPROVED",
        ewelinkClientId: tenantData.ewelinkClientId,
        ewelinkClientSecret: encryptedClientSecret,
        ewelinkRedirectUri: tenantData.ewelinkRedirectUri,
        approvedBy: globalAdminId,
        approvedAt: new Date()
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        globalAdminId,
        action: 'TENANT_CREATED',
        resource: `tenant:${tenant.id}`,
        details: JSON.stringify({ tenantName: tenant.name, domain: tenant.domain })
      }
    });

    return tenant;
  }

  /**
   * Get all tenants
   */
  static async getAllTenants(): Promise<Tenant[]> {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Approve a tenant
   */
  static async approveTenant(globalAdminId: string, tenantId: string): Promise<Tenant> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.status === "APPROVED") {
      throw new Error('Tenant is already approved');
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "APPROVED",
        approvedBy: globalAdminId,
        approvedAt: new Date()
      }
    });

    // Activate all pending tenant admins for this tenant
    await prisma.tenantAdmin.updateMany({
      where: { 
        tenantId,
        status: "PENDING"
      },
      data: {
        status: "ACTIVE"
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        globalAdminId,
        action: 'TENANT_APPROVED',
        resource: `tenant:${tenantId}`,
        details: JSON.stringify({ tenantName: tenant.name })
      }
    });

    return updatedTenant;
  }

  /**
   * Suspend a tenant
   */
  static async suspendTenant(globalAdminId: string, tenantId: string): Promise<Tenant> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "SUSPENDED"
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        globalAdminId,
        action: 'TENANT_SUSPENDED',
        resource: `tenant:${tenantId}`,
        details: JSON.stringify({ tenantName: tenant.name })
      }
    });

    return updatedTenant;
  }

  /**
   * Get tenant with decrypted OAuth secrets
   */
  static async getTenantWithSecrets(tenantId: string): Promise<Tenant & { decryptedClientSecret?: string }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    let decryptedClientSecret: string | undefined;
    if (tenant.ewelinkClientSecret) {
      try {
        decryptedClientSecret = decrypt(tenant.ewelinkClientSecret);
      } catch (error) {
        console.error('Failed to decrypt client secret for tenant:', tenantId);
      }
    }

    return {
      ...tenant,
      decryptedClientSecret
    };
  }

  /**
   * Update global admin eWeLink OAuth tokens
   */
  static async updateEWeLinkTokens(
    globalAdminId: string, 
    accessToken: string, 
    refreshToken?: string,
    ewelinkUserId?: string
  ): Promise<void> {
    await prisma.globalAdmin.update({
      where: { id: globalAdminId },
      data: {
        ewelinkAccessToken: accessToken,
        ewelinkRefreshToken: refreshToken,
        ewelinkUserId,
        lastActive: new Date()
      }
    });
  }

  /**
   * Get global admin by ID
   */
  static async getById(id: string): Promise<GlobalAdmin | null> {
    return prisma.globalAdmin.findUnique({
      where: { id }
    });
  }

  /**
   * Update MCP session ID
   */
  static async updateMCPSession(globalAdminId: string, sessionId: string): Promise<void> {
    await prisma.globalAdmin.update({
      where: { id: globalAdminId },
      data: {
        mcpSessionId: sessionId,
        lastActive: new Date()
      }
    });
  }
}
