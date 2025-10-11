import React, { useState, useEffect } from 'react';
import { 
  Shield, Building2, Users, Activity, BarChart3, Plus, 
  CheckCircle, XCircle, LogOut, Settings, Eye, TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function GlobalAdminDashboard({ 
  user, onLogout, tenants, stats, allUsers, settings,
  onCreateTenant, onApproveTenant, onSuspendTenant, onSuspendUser, onActivateUser, onUpdateSettings,
  onRefresh, loading 
}) {
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    ewelinkClientId: '',
    ewelinkClientSecret: '',
  });
  const [userFilter, setUserFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateTenant(formData);
    setFormData({ name: '', domain: '', ewelinkClientId: '', ewelinkClientSecret: '' });
    setShowCreateTenant(false);
  };

  const activeTenants = tenants.filter(t => t.status === 'APPROVED' || t.status === 'active').length;
  const pendingTenants = tenants.filter(t => t.status === 'PENDING' || t.status === 'pending').length;
  const totalUsers = tenants.reduce((sum, t) => sum + (t.adminCount || 0) + (t.userCount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Global Admin</h1>
                <p className="text-xs text-gray-500">System Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500">Super Administrator</p>
              </div>
              <Button onClick={onLogout} variant="outline" size="sm" className="shadow-sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm p-1 rounded-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tenants" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Building2 className="h-4 w-4 mr-2" />
              Tenants
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Tenants</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{tenants.length}</div>
                  <p className="text-xs text-gray-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                    {activeTenants} active
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Pending Approvals</CardTitle>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{pendingTenants}</div>
                  <p className="text-xs text-gray-600 mt-1">Require attention</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Users</CardTitle>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
                  <p className="text-xs text-gray-600 mt-1">Across all tenants</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">System Status</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Healthy</div>
                  <p className="text-xs text-gray-600 mt-1">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Latest tenant registrations and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tenants.slice(0, 5).map((tenant, index) => (
                    <div key={tenant.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${
                        tenant.status === 'APPROVED' || tenant.status === 'active' ? 'bg-green-500' : 
                        tenant.status === 'PENDING' || tenant.status === 'pending' ? 'bg-orange-500' : 
                        'bg-red-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{tenant.domain || 'No domain set'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tenant.status === 'APPROVED' || tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'PENDING' || tenant.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tenant Management</h2>
                <p className="text-sm text-gray-600 mt-1">Manage and approve tenant organizations</p>
              </div>
              <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Add a new tenant organization to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tenant Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Acme Corporation"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                        <input
                          type="text"
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="acme.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">eWeLink Client ID</label>
                        <input
                          type="text"
                          value={formData.ewelinkClientId}
                          onChange={(e) => setFormData({ ...formData, ewelinkClientId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">eWeLink Client Secret</label>
                        <input
                          type="password"
                          value={formData.ewelinkClientSecret}
                          onChange={(e) => setFormData({ ...formData, ewelinkClientSecret: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Tenant'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tenant</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Users</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                              <div className="text-sm text-gray-500">{tenant.domain || 'No domain'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              tenant.status === 'APPROVED' || tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                              tenant.status === 'PENDING' || tenant.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tenant.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {(tenant.adminCount || 0) + (tenant.userCount || 0)} users
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(tenant.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium space-x-2">
                            {(tenant.status === 'PENDING' || tenant.status === 'pending') && (
                              <Button
                                size="sm"
                                onClick={() => onApproveTenant(tenant.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {(tenant.status === 'APPROVED' || tenant.status === 'active') && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onSuspendTenant(tenant.id)}
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

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage users across all tenants</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Users</option>
                      <option value="global_admin">Global Admins</option>
                      <option value="tenant_admin">Tenant Admins</option>
                      <option value="tenant_user">Tenant Users</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers && allUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">USER</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">ROLE</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">TENANT</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">STATUS</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">LAST ACTIVE</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers
                          .filter(u => userFilter === 'all' || u.role.toLowerCase().replace(' ', '_') === userFilter)
                          .filter(u => !searchQuery || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((userItem) => (
                          <tr key={userItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-gray-900">{userItem.name || userItem.email}</div>
                                <div className="text-sm text-gray-500">{userItem.email}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-700">{userItem.role}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-700">{userItem.tenantName || 'N/A'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                userItem.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                userItem.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {userItem.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-gray-500">
                                {userItem.lastActive ? new Date(userItem.lastActive).toLocaleDateString() : 'Never'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {userItem.status === 'ACTIVE' ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => onSuspendUser(userItem.id, userItem.role.toLowerCase().replace(' ', '_'))}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Suspend
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => onActivateUser(userItem.id, userItem.role.toLowerCase().replace(' ', '_'))}
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Activate
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                    <p className="text-gray-500">No users match your current filters</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* General Settings */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Core system configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                      <p className="text-sm text-gray-500">Temporarily disable user access for system updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.maintenanceMode || false}
                        onChange={(e) => onUpdateSettings({ maintenanceMode: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h4 className="font-medium text-gray-900">Auto-Approve Tenants</h4>
                      <p className="text-sm text-gray-500">Automatically approve new tenant registrations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.autoApproveTenants || false}
                        onChange={(e) => onUpdateSettings({ autoApproveTenants: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h4 className="font-medium text-gray-900">Enable Email Notifications</h4>
                      <p className="text-sm text-gray-500">Send email alerts for important events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.enableEmailNotifications || false}
                        onChange={(e) => onUpdateSettings({ enableEmailNotifications: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Authentication and access control configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="py-3 border-b border-gray-100">
                    <label className="block">
                      <span className="font-medium text-gray-900">JWT Token Expiry (days)</span>
                      <p className="text-sm text-gray-500 mb-2">How long authentication tokens remain valid</p>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={settings.jwtExpiryDays || 7}
                        onChange={(e) => onUpdateSettings({ jwtExpiryDays: parseInt(e.target.value) })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="py-3 border-b border-gray-100">
                    <label className="block">
                      <span className="font-medium text-gray-900">Session Timeout (minutes)</span>
                      <p className="text-sm text-gray-500 mb-2">Auto-logout inactive users after specified time</p>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={settings.sessionTimeoutMinutes || 30}
                        onChange={(e) => onUpdateSettings({ sessionTimeoutMinutes: parseInt(e.target.value) })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h4 className="font-medium text-gray-900">Enable Rate Limiting</h4>
                      <p className="text-sm text-gray-500">Protect API from abuse and DoS attacks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.enableRateLimiting || false}
                        onChange={(e) => onUpdateSettings({ enableRateLimiting: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Tenant Settings */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Tenant Settings</CardTitle>
                  <CardDescription>Multi-tenancy configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="py-3 border-b border-gray-100">
                    <label className="block">
                      <span className="font-medium text-gray-900">Max Users Per Tenant</span>
                      <p className="text-sm text-gray-500 mb-2">Maximum number of users allowed per tenant</p>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.maxUsersPerTenant || 100}
                        onChange={(e) => onUpdateSettings({ maxUsersPerTenant: parseInt(e.target.value) })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>

                  <div className="py-3 border-b border-gray-100">
                    <label className="block">
                      <span className="font-medium text-gray-900">Audit Log Retention (days)</span>
                      <p className="text-sm text-gray-500 mb-2">How long to keep audit logs before archiving</p>
                      <input
                        type="number"
                        min="30"
                        max="365"
                        value={settings.auditLogRetentionDays || 90}
                        onChange={(e) => onUpdateSettings({ auditLogRetentionDays: parseInt(e.target.value) })}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default GlobalAdminDashboard;

