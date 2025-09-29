import { PrismaClient, TenantAdmin, Tenant, TenantUser } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { hashPassword, verifyPassword, encrypt, decrypt } from '../utils/encryption';

const prisma = new PrismaClient();

export interface TenantAdminJWTPayload {
  tenantAdminId: string;
  email: string;
  tenantId: string;
  role: 'tenant_admin';
}

export interface TenantAdminRegistrationData {
  email: string;
  password: string;
  name?: string;
  tenantName: string;
  domain?: string;
}

export interface OAuthConfigData {
  ewelinkClientId: string;
  ewelinkClientSecret: string;
  ewelinkRedirectUri: string;
}

export class TenantAdminService {
  /**
   * Register a new tenant admin (creates tenant in PENDING status)
   */
  static async registerTenantAdmin(data: TenantAdminRegistrationData): Promise<{ tenant: Tenant; admin: TenantAdmin }> {
    // Check if email is already used in this tenant
    if (data.domain) {
      const existingTenant = await prisma.tenant.findUnique({
        where: { domain: data.domain }
      });

      if (existingTenant) {
        throw new Error('Domain already taken by another tenant');
      }
    }

    // Check for existing admin with same email across all tenants
    const existingAdmin = await prisma.tenantAdmin.findFirst({
      where: { email: data.email }
    });

    if (existingAdmin) {
      throw new Error('Email already registered as tenant admin');
    }

    const hashedPassword = await hashPassword(data.password);

    // Create tenant in PENDING status (requires Global Admin approval)
    const tenant = await prisma.tenant.create({
      data: {
        name: data.tenantName,
        domain: data.domain,
        status: "PENDING"
      }
    });

    // Create tenant admin
    const admin = await prisma.tenantAdmin.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        tenantId: tenant.id,
        status: "PENDING" // Will be activated when tenant is approved
      }
    });

    // Log the registration
    await prisma.auditLog.create({
      data: {
        tenantAdminId: admin.id,
        action: 'TENANT_ADMIN_REGISTERED',
        resource: `tenant:${tenant.id}`,
        details: JSON.stringify({ tenantName: tenant.name, adminEmail: admin.email })
      }
    });

    return { tenant, admin };
  }

  /**
   * Authenticate tenant admin
   */
  static async authenticate(email: string, password: string): Promise<{ admin: TenantAdmin & { tenant: Tenant }; token: string }> {
    const admin = await prisma.tenantAdmin.findFirst({
      where: { email },
      include: { tenant: true }
    });

    if (!admin) {
      throw new Error('Invalid email or password');
    }

    // Check if tenant is approved
    if (admin.tenant.status !== "APPROVED") {
      throw new Error('Tenant is not approved yet. Please wait for Global Admin approval.');
    }

    // Check if admin is active
    if (admin.status !== "ACTIVE") {
      throw new Error('Account is not active. Please contact support.');
    }

    const isValidPassword = await verifyPassword(password, admin.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last active
    await prisma.tenantAdmin.update({
      where: { id: admin.id },
      data: { lastActive: new Date() }
    });

    // Generate JWT token
    const payload: TenantAdminJWTPayload = {
      tenantAdminId: admin.id,
      email: admin.email,
      tenantId: admin.tenantId,
      role: 'tenant_admin'
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return { admin, token };
  }

  /**
   * Configure eWeLink OAuth for tenant
   */
  static async configureOAuth(tenantAdminId: string, oauthConfig: OAuthConfigData): Promise<Tenant> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId },
      include: { tenant: true }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    if (admin.tenant.status !== "APPROVED") {
      throw new Error('Tenant must be approved before configuring OAuth');
    }

    // Encrypt the client secret
    const encryptedClientSecret = encrypt(oauthConfig.ewelinkClientSecret);

    // Update tenant with OAuth configuration
    const updatedTenant = await prisma.tenant.update({
      where: { id: admin.tenantId },
      data: {
        ewelinkClientId: oauthConfig.ewelinkClientId,
        ewelinkClientSecret: encryptedClientSecret,
        ewelinkRedirectUri: oauthConfig.ewelinkRedirectUri
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantAdminId,
        action: 'OAUTH_CONFIGURED',
        resource: `tenant:${admin.tenantId}`,
        details: JSON.stringify({ clientId: oauthConfig.ewelinkClientId })
      }
    });

    return updatedTenant;
  }

  /**
   * Get tenant users
   */
  static async getTenantUsers(tenantAdminId: string): Promise<TenantUser[]> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    return prisma.tenantUser.findMany({
      where: { tenantId: admin.tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Invite/Create tenant user
   */
  static async createTenantUser(tenantAdminId: string, email: string, name?: string): Promise<TenantUser> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    // Check if user already exists in this tenant
    const existingUser = await prisma.tenantUser.findUnique({
      where: { 
        email_tenantId: {
          email,
          tenantId: admin.tenantId
        }
      }
    });

    if (existingUser) {
      throw new Error('User already exists in this tenant');
    }

    // Generate a default password for the user
    const defaultPassword = 'user123'; // Default password for demo purposes
    const hashedPassword = await hashPassword(defaultPassword);

    // Create tenant user
    const user = await prisma.tenantUser.create({
      data: {
        email,
        name,
        password: hashedPassword,
        tenantId: admin.tenantId,
        status: "ACTIVE"
      }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantAdminId,
        action: 'TENANT_USER_CREATED',
        resource: `user:${user.id}`,
        details: JSON.stringify({ userEmail: email })
      }
    });

    return user;
  }

  /**
   * Update tenant user status
   */
  static async updateUserStatus(tenantAdminId: string, userId: string, status: string): Promise<TenantUser> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    // Verify user belongs to the same tenant
    const user = await prisma.tenantUser.findFirst({
      where: {
        id: userId,
        tenantId: admin.tenantId
      }
    });

    if (!user) {
      throw new Error('User not found in your tenant');
    }

    const updatedUser = await prisma.tenantUser.update({
      where: { id: userId },
      data: { status }
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        tenantAdminId,
        action: 'TENANT_USER_STATUS_UPDATED',
        resource: `user:${userId}`,
        details: JSON.stringify({ newStatus: status, userEmail: user.email })
      }
    });

    return updatedUser;
  }

  /**
   * Get tenant admin profile
   */
  static async getProfile(tenantAdminId: string): Promise<TenantAdmin & { tenant: Tenant }> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId },
      include: { tenant: true }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    return admin;
  }

  /**
   * Update tenant admin eWeLink OAuth tokens
   */
  static async updateEWeLinkTokens(
    tenantAdminId: string, 
    accessToken: string, 
    refreshToken?: string,
    ewelinkUserId?: string
  ): Promise<void> {
    await prisma.tenantAdmin.update({
      where: { id: tenantAdminId },
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
  static async updateMCPSession(tenantAdminId: string, sessionId: string): Promise<void> {
    await prisma.tenantAdmin.update({
      where: { id: tenantAdminId },
      data: {
        mcpSessionId: sessionId,
        lastActive: new Date()
      }
    });
  }

  /**
   * Get tenant with decrypted OAuth secrets (for tenant admin)
   */
  static async getTenantOAuthConfig(tenantAdminId: string): Promise<{
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  }> {
    const admin = await prisma.tenantAdmin.findUnique({
      where: { id: tenantAdminId },
      include: { tenant: true }
    });

    if (!admin) {
      throw new Error('Tenant admin not found');
    }

    const tenant = admin.tenant;
    let decryptedClientSecret: string | undefined;

    if (tenant.ewelinkClientSecret) {
      try {
        decryptedClientSecret = decrypt(tenant.ewelinkClientSecret);
      } catch (error) {
        console.error('Failed to decrypt client secret for tenant:', tenant.id);
      }
    }

    return {
      clientId: tenant.ewelinkClientId || undefined,
      clientSecret: decryptedClientSecret,
      redirectUri: tenant.ewelinkRedirectUri || undefined
    };
  }

  /**
   * Activate tenant admin when tenant is approved
   */
  static async activateAdmin(tenantId: string): Promise<void> {
    await prisma.tenantAdmin.updateMany({
      where: { 
        tenantId,
        status: "PENDING"
      },
      data: {
        status: "ACTIVE"
      }
    });
  }
}
