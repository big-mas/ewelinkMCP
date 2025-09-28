import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Building2, 
  Settings, 
  Shield, 
  Home, 
  LogOut, 
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  Link,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { cn, formatDate, formatStatus } from './lib/utils';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState('tenant_user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Admin data states
  const [tenants, setTenants] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [oauthConnected, setOauthConnected] = useState(false);

  // Modal states
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let response;
      
      // Try different login endpoints based on user type
      if (userType === 'global_admin') {
        response = await axios.post('/api/global-admin/login', loginForm);
      } else if (userType === 'tenant_admin') {
        response = await axios.post('/api/tenant-admin/login', loginForm);
      } else {
        response = await axios.post('/api/auth/login', loginForm);
      }
      
      const { token, admin, user: userData } = response.data;
      const finalUser = admin || userData;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(finalUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(finalUser);
      setIsLoggedIn(true);
      setSuccess('Login successful!');
      setLoginForm({ email: '', password: '' });
      
      // Load appropriate data based on user type
      if (userType === 'global_admin') {
        loadGlobalAdminData();
      } else if (userType === 'tenant_admin') {
        loadTenantAdminData();
      } else {
        loadTenantUserData();
      }
      
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
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
    setTenants([]);
    setTenantUsers([]);
    setDevices([]);
    setStats({});
    setOauthConnected(false);
    setSuccess('Logged out successfully');
  };

  // Global Admin Functions
  const loadGlobalAdminData = async () => {
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        axios.get('/api/global-admin/tenants'),
        axios.get('/api/global-admin/stats').catch(() => ({ data: {} }))
      ]);
      
      setTenants(tenantsRes.data.tenants || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Failed to load global admin data:', error);
    }
  };

  const createTenant = async (tenantData) => {
    try {
      setLoading(true);
      await axios.post('/api/global-admin/tenants', tenantData);
      setSuccess('Tenant created successfully');
      setShowCreateTenant(false);
      loadGlobalAdminData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const approveTenant = async (tenantId) => {
    try {
      await axios.put(`/api/global-admin/tenants/${tenantId}/approve`);
      setSuccess('Tenant approved successfully');
      loadGlobalAdminData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to approve tenant');
    }
  };

  const suspendTenant = async (tenantId) => {
    try {
      await axios.put(`/api/global-admin/tenants/${tenantId}/suspend`);
      setSuccess('Tenant suspended successfully');
      loadGlobalAdminData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to suspend tenant');
    }
  };

  // Tenant Admin Functions
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
    } catch (error) {
      console.error('Failed to load tenant admin data:', error);
    }
  };

  const createTenantUser = async (userData) => {
    try {
      setLoading(true);
      await axios.post('/api/tenant-admin/users', userData);
      setSuccess('User created successfully');
      setShowCreateUser(false);
      loadTenantAdminData();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Tenant User Functions
  const loadTenantUserData = async () => {
    try {
      const [devicesRes, oauthRes] = await Promise.all([
        axios.get('/api/tenant/devices').catch(() => ({ data: { devices: [] } })),
        axios.get('/api/oauth/status').catch(() => ({ data: { connected: false } }))
      ]);
      
      setDevices(devicesRes.data.devices || []);
      setOauthConnected(oauthRes.data.connected);
    } catch (error) {
      console.error('Failed to load tenant user data:', error);
    }
  };

  const connectEWeLink = async () => {
    try {
      const response = await axios.get('/api/oauth/authorize');
      window.location.href = response.data.oauth_url;
    } catch (error) {
      setError('Failed to initiate eWeLink connection');
    }
  };

  const controlDevice = async (deviceId, params) => {
    try {
      setLoading(true);
      await axios.post(`/api/tenant/devices/${deviceId}/control`, { params });
      setSuccess(`Device controlled successfully`);
      setTimeout(() => {
        if (userType === 'tenant_admin') {
          loadTenantAdminData();
        } else {
          loadTenantUserData();
        }
      }, 1000);
    } catch (error) {
      setError(`Failed to control device: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSwitch = (device) => {
    const currentState = device.params?.switch || 'off';
    const newState = currentState === 'on' ? 'off' : 'on';
    controlDevice(device.deviceid, { switch: newState });
  };

  const copyMcpUrl = async () => {
    try {
      const response = await axios.get('/api/users/mcp-url');
      await navigator.clipboard.writeText(response.data.mcpUrl);
      setSuccess('MCP URL copied to clipboard');
    } catch (error) {
      setError('Failed to get MCP URL');
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Shield className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            eWeLink MCP Server
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="py-8 px-4 shadow-xl">
            <CardContent>
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </div>
              )}

              {/* User Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="tenant_user">Tenant User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                  <option value="global_admin">Global Admin</option>
                </select>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Global Admin Dashboard
  if (userType === 'global_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-indigo-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Global Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Welcome, {user?.name || user?.email}</span>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tenants.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {tenants.filter(t => t.status === 'active').length} active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tenants.filter(t => t.status === 'pending').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Require approval
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {tenants.reduce((sum, t) => sum + (t.adminCount || 0) + (t.userCount || 0), 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across all tenants
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">Healthy</div>
                    <p className="text-xs text-muted-foreground">
                      All systems operational
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest tenant and user activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tenants.slice(0, 5).map((tenant) => (
                      <div key={tenant.id} className="flex items-center space-x-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{tenant.name}</p>
                          <p className="text-xs text-gray-500">
                            Created {formatDate(tenant.createdAt)}
                          </p>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          formatStatus(tenant.status).color
                        )}>
                          {formatStatus(tenant.status).label}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tenants" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Tenant Management</h2>
                <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Add a new tenant to the system
                      </DialogDescription>
                    </DialogHeader>
                    <CreateTenantForm onSubmit={createTenant} loading={loading} />
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tenants.map((tenant) => (
                          <tr key={tenant.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {tenant.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {tenant.domain || 'No domain'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                formatStatus(tenant.status).color
                              )}>
                                {formatStatus(tenant.status).label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(tenant.adminCount || 0) + (tenant.userCount || 0)} users
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(tenant.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              {tenant.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => approveTenant(tenant.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {tenant.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => suspendTenant(tenant.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Suspend
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Manage users across all tenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">User management interface coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <h2 className="text-2xl font-bold">System Settings</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Global Configuration</CardTitle>
                  <CardDescription>System-wide settings and configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Settings interface coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  // Tenant Admin Dashboard
  if (userType === 'tenant_admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Tenant Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Welcome, {user?.name || user?.email}</span>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="oauth">OAuth Config</TabsTrigger>
              <TabsTrigger value="mcp">MCP</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tenantUsers.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active tenant users
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Connected Devices</CardTitle>
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{devices.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {devices.filter(d => d.online).length} online
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">OAuth Status</CardTitle>
                    <Link className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-bold",
                      oauthConnected ? "text-green-600" : "text-red-600"
                    )}>
                      {oauthConnected ? 'Connected' : 'Not Connected'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      eWeLink integration
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">User Management</h2>
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user for your tenant
                      </DialogDescription>
                    </DialogHeader>
                    <CreateUserForm onSubmit={createTenantUser} loading={loading} />
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Joined
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tenantUsers.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                formatStatus(user.status).color
                              )}>
                                {formatStatus(user.status).label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="oauth" className="space-y-6">
              <h2 className="text-2xl font-bold">OAuth Configuration</h2>
              <Card>
                <CardHeader>
                  <CardTitle>eWeLink Integration</CardTitle>
                  <CardDescription>Configure OAuth settings for your tenant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">eWeLink Connection</h3>
                      <p className="text-sm text-gray-500">
                        {oauthConnected ? 'Connected and ready' : 'Not connected'}
                      </p>
                    </div>
                    <Button
                      onClick={connectEWeLink}
                      variant={oauthConnected ? "outline" : "default"}
                    >
                      {oauthConnected ? 'Reconnect' : 'Connect'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mcp" className="space-y-6">
              <h2 className="text-2xl font-bold">MCP Integration</h2>
              <Card>
                <CardHeader>
                  <CardTitle>MCP URL</CardTitle>
                  <CardDescription>Your tenant's MCP endpoint URL</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Button onClick={copyMcpUrl} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy MCP URL
                    </Button>
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Endpoint
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  // Tenant User Dashboard (default)
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Home className="h-8 w-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">My Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="devices">My Devices</TabsTrigger>
            <TabsTrigger value="oauth">eWeLink</TabsTrigger>
            <TabsTrigger value="mcp">MCP Access</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <Card key={device.deviceid}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        device.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      )}>
                        {device.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <CardDescription>{device.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {device.params?.switch && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          Status: {device.params.switch === 'on' ? 'On' : 'Off'}
                        </span>
                        <Button
                          onClick={() => toggleSwitch(device)}
                          disabled={!device.online || loading}
                          size="sm"
                          variant={device.params.switch === 'on' ? "destructive" : "default"}
                        >
                          Turn {device.params.switch === 'on' ? 'Off' : 'On'}
                        </Button>
                      </div>
                    )}
                    
                    {device.params?.bright && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-700">
                          Brightness: {device.params.bright}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {devices.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                  <p className="text-gray-500 mb-4">
                    Connect your eWeLink account to see your devices
                  </p>
                  <Button onClick={connectEWeLink}>
                    Connect eWeLink Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="oauth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>eWeLink Integration</CardTitle>
                <CardDescription>Connect your eWeLink account to control your devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Connection Status</h3>
                    <p className="text-sm text-gray-500">
                      {oauthConnected ? 'Connected and ready' : 'Not connected'}
                    </p>
                  </div>
                  <Button
                    onClick={connectEWeLink}
                    variant={oauthConnected ? "outline" : "default"}
                  >
                    {oauthConnected ? 'Reconnect' : 'Connect Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MCP Access</CardTitle>
                <CardDescription>Your personal MCP endpoint for AI integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Button onClick={copyMcpUrl} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy My MCP URL
                    </Button>
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Use this URL to connect AI assistants to your eWeLink devices
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Create Tenant Form Component
function CreateTenantForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    ewelinkClientId: '',
    ewelinkClientSecret: '',
    ewelinkRedirectUri: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tenant Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Domain
        </label>
        <input
          type="text"
          value={formData.domain}
          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          eWeLink Client ID
        </label>
        <input
          type="text"
          value={formData.ewelinkClientId}
          onChange={(e) => setFormData({ ...formData, ewelinkClientId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          eWeLink Client Secret
        </label>
        <input
          type="password"
          value={formData.ewelinkClientSecret}
          onChange={(e) => setFormData({ ...formData, ewelinkClientSecret: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Tenant'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Create User Form Component
function CreateUserForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password *
        </label>
        <input
          type="password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default App;
