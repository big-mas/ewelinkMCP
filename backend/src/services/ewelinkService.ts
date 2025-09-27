import axios, { AxiosInstance } from 'axios';
import { config } from '../utils/config';
import { EWeLinkDevice, EWeLinkDeviceControl } from '../types/mcp';

export class EWeLinkService {
  private api: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: config.ewelink.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    user: any;
  }> {
    try {
      const response = await axios.post(`${config.ewelink.oauthUrl}/v2/user/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: config.ewelink.clientId,
        client_secret: config.ewelink.clientSecret,
        redirect_uri: config.ewelink.redirectUri,
        code: code
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    try {
      const response = await axios.post(`${config.ewelink.oauthUrl}/v2/user/oauth/token`, {
        grant_type: 'refresh_token',
        client_id: config.ewelink.clientId,
        client_secret: config.ewelink.clientSecret,
        refresh_token: refreshToken
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  async getDevices(): Promise<EWeLinkDevice[]> {
    try {
      const response = await this.api.get('/v2/device/thing');
      
      if (response.data.error === 0) {
        return response.data.data.thingList || [];
      } else {
        throw new Error(response.data.msg || 'Failed to fetch devices');
      }
    } catch (error: any) {
      console.error('Error fetching devices:', error.response?.data || error.message);
      throw new Error('Failed to fetch devices from eWeLink');
    }
  }

  async getDevice(deviceId: string): Promise<EWeLinkDevice | null> {
    try {
      const response = await this.api.get(`/v2/device/thing/${deviceId}`);
      
      if (response.data.error === 0) {
        return response.data.data;
      } else {
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching device:', error.response?.data || error.message);
      return null;
    }
  }

  async controlDevice(control: EWeLinkDeviceControl): Promise<boolean> {
    try {
      const response = await this.api.post('/v2/device/thing/status', {
        type: 1,
        id: control.deviceId,
        params: control.params
      });

      return response.data.error === 0;
    } catch (error: any) {
      console.error('Error controlling device:', error.response?.data || error.message);
      throw new Error('Failed to control device');
    }
  }

  async getDeviceStatus(deviceId: string): Promise<Record<string, any> | null> {
    try {
      const response = await this.api.get(`/v2/device/thing/status/${deviceId}`);
      
      if (response.data.error === 0) {
        return response.data.data.params || {};
      } else {
        return null;
      }
    } catch (error: any) {
      console.error('Error fetching device status:', error.response?.data || error.message);
      return null;
    }
  }

  async getUserInfo(): Promise<any> {
    try {
      const response = await this.api.get('/v2/user/profile');
      
      if (response.data.error === 0) {
        return response.data.data;
      } else {
        throw new Error(response.data.msg || 'Failed to fetch user info');
      }
    } catch (error: any) {
      console.error('Error fetching user info:', error.response?.data || error.message);
      throw new Error('Failed to fetch user information');
    }
  }

  // Helper method to generate OAuth URL
  static generateOAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: config.ewelink.clientId,
      redirect_uri: config.ewelink.redirectUri,
      response_type: 'code',
      scope: 'read write',
      ...(state && { state })
    });

    return `${config.ewelink.oauthUrl}/v2/user/oauth/authorize?${params.toString()}`;
  }
}
