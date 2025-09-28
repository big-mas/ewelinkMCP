import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { decrypt } from '../utils/encryption';
import { GlobalAdminService } from './globalAdminService';
import { TenantAdminService } from './tenantAdminService';
import { TenantUserService } from './tenantUserService';

const prisma = new PrismaClient();

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiUrl?: string;
  oauthUrl?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    userid: string;
    email: string;
    nickname?: string;
  };
}

export class EnhancedOAuthService {
  private static readonly DEFAULT_API_URL = 'https://eu-apia.coolkit.cc';
  private static readonly DEFAULT_OAUTH_URL = 'https://c2ccdn.coolkit.cc';

  /**
   * Get OAuth configuration for a tenant
   */
  static async getTenantOAuthConfig(tenantId: string): Promise<OAuthConfig | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.ewelinkClientId || !tenant.ewelinkClientSecret) {
      return null;
    }

    let decryptedSecret: string;
    try {
      decryptedSecret = decrypt(tenant.ewelinkClientSecret);
    } catch (error) {
      console.error('Failed to decrypt OAuth secret for tenant:', tenantId);
      return null;
    }

    return {
      clientId: tenant.ewelinkClientId,
      clientSecret: decryptedSecret,
      redirectUri: tenant.ewelinkRedirectUri || '',
      apiUrl: process.env.EWELINK_API_URL || this.DEFAULT_API_URL,
      oauthUrl: process.env.EWELINK_OAUTH_URL || this.DEFAULT_OAUTH_URL
    };
  }

  /**
   * Get global OAuth configuration (fallback)
   */
  static getGlobalOAuthConfig(): OAuthConfig | null {
    const clientId = process.env.EWELINK_CLIENT_ID;
    const clientSecret = process.env.EWELINK_CLIENT_SECRET;
    const redirectUri = process.env.EWELINK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      apiUrl: process.env.EWELINK_API_URL || this.DEFAULT_API_URL,
      oauthUrl: process.env.EWELINK_OAUTH_URL || this.DEFAULT_OAUTH_URL
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(config: OAuthConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'read write',
      ...(state && { state })
    });

    return `${config.oauthUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(config: OAuthConfig, code: string): Promise<OAuthTokenResponse> {
    try {
      const response = await axios.post(`${config.oauthUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`OAuth error: ${response.data.error_description || response.data.error}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('OAuth token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Get user info from eWeLink API
   */
  static async getUserInfo(config: OAuthConfig, accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${config.apiUrl}/v2/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error !== 0) {
        throw new Error(`API error: ${response.data.msg || 'Unknown error'}`);
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Get user info error:', error.response?.data || error.message);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(config: OAuthConfig, refreshToken: string): Promise<OAuthTokenResponse> {
    try {
      const response = await axios.post(`${config.oauthUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`OAuth refresh error: ${response.data.error_description || response.data.error}`);
      }

      return response.data;
    } catch (error: any) {
      console.error('OAuth token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Handle OAuth callback for Global Admin
   */
  static async handleGlobalAdminCallback(code: string, state?: string): Promise<{
    admin: any;
    token: string;
    ewelinkUser: any;
  }> {
    const config = this.getGlobalOAuthConfig();
    if (!config) {
      throw new Error('Global OAuth configuration not found');
    }

    // Extract globalAdminId from state if provided
    let globalAdminId: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        globalAdminId = stateData.globalAdminId;
      } catch (error) {
        console.error('Failed to parse OAuth state:', error);
      }
    }

    if (!globalAdminId) {
      throw new Error('Global Admin ID not found in OAuth state');
    }

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(config, code);
    
    // Get user info
    const ewelinkUser = await this.getUserInfo(config, tokenResponse.access_token);

    // Update Global Admin with OAuth tokens
    await GlobalAdminService.updateEWeLinkTokens(
      globalAdminId,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      ewelinkUser.userid
    );

    // Get updated admin
    const admin = await GlobalAdminService.getById(globalAdminId);
    if (!admin) {
      throw new Error('Global Admin not found');
    }

    // Generate new JWT token
    const { token } = await GlobalAdminService.authenticate(admin.email, ''); // Skip password check

    return { admin, token, ewelinkUser };
  }

  /**
   * Handle OAuth callback for Tenant Admin
   */
  static async handleTenantAdminCallback(tenantId: string, code: string, state?: string): Promise<{
    admin: any;
    token: string;
    ewelinkUser: any;
  }> {
    const config = await this.getTenantOAuthConfig(tenantId);
    if (!config) {
      throw new Error('Tenant OAuth configuration not found');
    }

    // Extract tenantAdminId from state if provided
    let tenantAdminId: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        tenantAdminId = stateData.tenantAdminId;
      } catch (error) {
        console.error('Failed to parse OAuth state:', error);
      }
    }

    if (!tenantAdminId) {
      throw new Error('Tenant Admin ID not found in OAuth state');
    }

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(config, code);
    
    // Get user info
    const ewelinkUser = await this.getUserInfo(config, tokenResponse.access_token);

    // Update Tenant Admin with OAuth tokens
    await TenantAdminService.updateEWeLinkTokens(
      tenantAdminId,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      ewelinkUser.userid
    );

    // Get updated admin
    const admin = await TenantAdminService.getProfile(tenantAdminId);

    // Generate new JWT token (simplified - in real implementation, you'd re-authenticate)
    const payload = {
      tenantAdminId: admin.id,
      email: admin.email,
      tenantId: admin.tenantId,
      role: 'tenant_admin'
    };

    const jwt = await import('jsonwebtoken');
    const { config: appConfig } = await import('../utils/config');
    const token = jwt.sign(payload, appConfig.jwtSecret, { expiresIn: '7d' });

    return { admin, token, ewelinkUser };
  }

  /**
   * Handle OAuth callback for Tenant User
   */
  static async handleTenantUserCallback(tenantId: string, code: string, state?: string): Promise<{
    user: any;
    token: string;
    ewelinkUser: any;
  }> {
    const config = await this.getTenantOAuthConfig(tenantId);
    if (!config) {
      throw new Error('Tenant OAuth configuration not found');
    }

    // Extract user email from state if provided
    let userEmail: string | undefined;
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        userEmail = stateData.userEmail;
      } catch (error) {
        console.error('Failed to parse OAuth state:', error);
      }
    }

    if (!userEmail) {
      throw new Error('User email not found in OAuth state');
    }

    // Exchange code for token
    const tokenResponse = await this.exchangeCodeForToken(config, code);
    
    // Get user info
    const ewelinkUser = await this.getUserInfo(config, tokenResponse.access_token);

    // Authenticate user with OAuth tokens
    const { user, token } = await TenantUserService.authenticateWithOAuth(
      userEmail,
      tenantId,
      tokenResponse.access_token,
      tokenResponse.refresh_token,
      ewelinkUser.userid
    );

    return { user, token, ewelinkUser };
  }

  /**
   * Generate OAuth state parameter
   */
  static generateOAuthState(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Parse OAuth state parameter
   */
  static parseOAuthState(state: string): any {
    try {
      return JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid OAuth state parameter');
    }
  }

  /**
   * Validate OAuth configuration
   */
  static validateOAuthConfig(config: OAuthConfig): boolean {
    return !!(config.clientId && config.clientSecret && config.redirectUri);
  }
}
