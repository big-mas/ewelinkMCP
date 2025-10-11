import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LoginScreen } from './components/auth/LoginScreen';
import { GlobalAdminDashboard } from './components/dashboards/GlobalAdminDashboard';
import { TenantAdminDashboard } from './components/dashboards/TenantAdminDashboard';
import { TenantUserDashboard } from './components/dashboards/TenantUserDashboard';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState('tenant_user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dashboard data states
  const [tenants, setTenants] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [oauthConnected, setOauthConnected] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [settings, setSettings] = useState({});

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsLoggedIn(true);
      
      // Determine user type from stored data
      if (userData.role === 'global_admin') {
        setUserType('global_admin');
        loadGlobalAdminData();
      } else if (userData.role === 'tenant_admin') {
        setUserType('tenant_admin');
        loadTenantAdminData();
      } else {
        setUserType('tenant_user');
        loadTenantUserData();
      }
    }
  }, []);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Authentication functions
  const handleLogin = async (formData) => {
    setLoading(true);
    setError('');
    
    try {
      let response;
      
      // Try different login endpoints based on user type
      if (formData.userType === 'global_admin') {
        response = await axios.post('/api/global-admin/login', {
          email: formData.email,
          password: formData.password
        });
      } else if (formData.userType === 'tenant_admin') {
        response = await axios.post('/api/tenant-admin/login', {
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await axios.post('/api/tenant-user/login', {
          email: formData.email,
          password: formData.password
        });
      }
      
      const { token, admin, user: userData } = response.data;
      const finalUser = admin || userData;
      
      // Store authentication data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(finalUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(finalUser);
      setUserType(formData.userType);
      setIsLoggedIn(true);
      setSuccess('Login successful!');
      
      // Load appropriate data based on user type
      if (formData.userType === 'global_admin') {
        await loadGlobalAdminData();
      } else if (formData.userType === 'tenant_admin') {
        await loadTenantAdminData();
      } else {
        await loadTenantUserData();
      }
      
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    
    setUser(null);
    setIsLoggedIn(false);
    setUserType('tenant_user');
    setTenants([]);
    setTenantUsers([]);
    setDevices([]);
    setStats({});
    setOauthConnected(false);
    setSuccess('Logged out successfully');
  };

  // Global Admin functions
  const loadGlobalAdminData = async () => {
    try {
      const [tenantsRes, statsRes, usersRes, settingsRes] = await Promise.all([
        axios.get('/api/global-admin/tenants'),
        axios.get('/api/global-admin/stats').catch(() => ({ data: {} })),
        axios.get('/api/global-admin/users').catch(() => ({ data: { users: [] } })),
        axios.get('/api/global-admin/settings').catch(() => ({ data: { settings: {} } }))
      ]);
      
      setTenants(tenantsRes.data.tenants || []);
      setStats(statsRes.data || {});
      setAllUsers(usersRes.data.users || []);
      setSettings(settingsRes.data.settings || {});
    } catch (err) {
      console.error('Failed to load global admin data:', err);
      setError('Failed to load dashboard data');
    }
  };

  const handleCreateTenant = async (tenantData) => {
    try {
      setLoading(true);
      await axios.post('/api/global-admin/tenants', tenantData);
      setSuccess('Tenant created successfully');
      await loadGlobalAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tenant');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTenant = async (tenantId) => {
    try {
      await axios.put(`/api/global-admin/tenants/${tenantId}/approve`);
      setSuccess('Tenant approved successfully');
      await loadGlobalAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve tenant');
    }
  };

  const handleSuspendTenant = async (tenantId) => {
    try {
      await axios.put(`/api/global-admin/tenants/${tenantId}/suspend`);
      setSuccess('Tenant suspended successfully');
      await loadGlobalAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to suspend tenant');
    }
  };

  const handleSuspendUser = async (userId, userType) => {
    try {
      await axios.put(`/api/global-admin/users/${userId}/suspend`, { type: userType });
      setSuccess('User suspended successfully');
      await loadGlobalAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId, userType) => {
    try {
      await axios.put(`/api/global-admin/users/${userId}/activate`, { type: userType });
      setSuccess('User activated successfully');
      await loadGlobalAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate user');
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      setLoading(true);
      await axios.put('/api/global-admin/settings', newSettings);
      setSuccess('Settings updated successfully');
      setSettings({ ...settings, ...newSettings });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Tenant Admin functions
  const loadTenantAdminData = async () => {
    try {
      const [usersRes, devicesRes, oauthRes] = await Promise.all([
        axios.get('/api/tenant-admin/users'),
        axios.get('/api/tenant/devices').catch(() => ({ data: { devices: [] } })),
        axios.get('/api/oauth/status').catch(() => ({ data: { connected: false } }))
      ]);
      
      setTenantUsers(usersRes.data.users || []);
      setDevices(devicesRes.data.devices || []);
      setOauthConnected(oauthRes.data.connected);
    } catch (err) {
      console.error('Failed to load tenant admin data:', err);
      setError('Failed to load dashboard data');
    }
  };

  const handleCreateTenantUser = async (userData) => {
    try {
      setLoading(true);
      await axios.post('/api/tenant-admin/users', userData);
      setSuccess('User created successfully');
      await loadTenantAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Tenant User functions
  const loadTenantUserData = async () => {
    try {
      const [devicesRes, oauthRes] = await Promise.all([
        axios.get('/api/tenant/devices').catch(() => ({ data: { devices: [] } })),
        axios.get('/api/oauth/status').catch(() => ({ data: { connected: false } }))
      ]);
      
      setDevices(devicesRes.data.devices || []);
      setOauthConnected(oauthRes.data.connected);
    } catch (err) {
      console.error('Failed to load tenant user data:', err);
      setError('Failed to load dashboard data');
    }
  };

  // Shared functions
  const handleConnectEWeLink = async () => {
    try {
      const response = await axios.get('/api/oauth/authorize');
      window.location.href = response.data.oauth_url;
    } catch (err) {
      setError('Failed to initiate eWeLink connection');
    }
  };

  const handleControlDevice = async (deviceId, params) => {
    try {
      setLoading(true);
      await axios.post(`/api/tenant/devices/${deviceId}/control`, { params });
      setSuccess('Device controlled successfully');
      
      // Reload device data after control
      setTimeout(() => {
        if (userType === 'tenant_admin') {
          loadTenantAdminData();
        } else {
          loadTenantUserData();
        }
      }, 1000);
    } catch (err) {
      setError(`Failed to control device: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMcpUrl = async () => {
    try {
      const response = await axios.get('/api/users/mcp-url');
      await navigator.clipboard.writeText(response.data.mcpUrl);
      setSuccess('MCP URL copied to clipboard');
    } catch (err) {
      setError('Failed to copy MCP URL');
    }
  };

  // Render login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} loading={loading} />;
  }

  // Render appropriate dashboard based on user type
  if (userType === 'global_admin') {
    return (
      <GlobalAdminDashboard
        user={user}
        onLogout={handleLogout}
        tenants={tenants}
        stats={stats}
        allUsers={allUsers}
        settings={settings}
        onCreateTenant={handleCreateTenant}
        onApproveTenant={handleApproveTenant}
        onSuspendTenant={handleSuspendTenant}
        onSuspendUser={handleSuspendUser}
        onActivateUser={handleActivateUser}
        onUpdateSettings={handleUpdateSettings}
        onRefresh={loadGlobalAdminData}
        loading={loading}
      />
    );
  }

  if (userType === 'tenant_admin') {
    return (
      <TenantAdminDashboard
        user={user}
        onLogout={handleLogout}
        tenantUsers={tenantUsers}
        devices={devices}
        oauthConnected={oauthConnected}
        onCreateUser={handleCreateTenantUser}
        onConnectEWeLink={handleConnectEWeLink}
        onCopyMcpUrl={handleCopyMcpUrl}
        loading={loading}
      />
    );
  }

  // Default to Tenant User Dashboard
  return (
    <TenantUserDashboard
      user={user}
      onLogout={handleLogout}
      devices={devices}
      oauthConnected={oauthConnected}
      onConnectEWeLink={handleConnectEWeLink}
      onControlDevice={handleControlDevice}
      onCopyMcpUrl={handleCopyMcpUrl}
      loading={loading}
    />
  );
}

export default App;

