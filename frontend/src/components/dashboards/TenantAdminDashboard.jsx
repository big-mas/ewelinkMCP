import React, { useState } from 'react';
import { 
  Building2, Users, Home, Link, LogOut, Plus, Eye, 
  Copy, ExternalLink, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function TenantAdminDashboard({ 
  user, 
  onLogout, 
  tenantUsers, 
  devices, 
  oauthConnected, 
  onCreateUser, 
  onConnectEWeLink,
  onCopyMcpUrl,
  loading 
}) {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onCreateUser(formData);
    setFormData({ email: '', password: '' });
    setShowCreateUser(false);
  };

  const onlineDevices = devices.filter(d => d.online).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tenant Admin</h1>
                <p className="text-xs text-gray-500">Organization Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
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
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="oauth" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              OAuth Config
            </TabsTrigger>
            <TabsTrigger value="mcp" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              MCP
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Users</CardTitle>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{tenantUsers.length}</div>
                  <p className="text-xs text-gray-600 mt-1">Active tenant users</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Connected Devices</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Home className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{devices.length}</div>
                  <p className="text-xs text-gray-600 mt-1">{onlineDevices} online</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">OAuth Status</CardTitle>
                  <div className={`p-2 rounded-lg ${oauthConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Link className={`h-5 w-5 ${oauthConnected ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${oauthConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {oauthConnected ? 'Connected' : 'Not Connected'}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">eWeLink integration</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Tenant Overview</CardTitle>
                <CardDescription>Your organization's smart home management dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Welcome to your admin dashboard</p>
                      <p className="text-xs text-gray-600 mt-1">Manage users, configure integrations, and monitor your smart home ecosystem</p>
                    </div>
                    {!oauthConnected && (
                      <Button onClick={onConnectEWeLink} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                        Connect eWeLink
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-600 mt-1">Add and manage users in your organization</p>
              </div>
              <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add New User</DialogTitle>
                      <DialogDescription>
                        Create a new user account for your tenant
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Joined</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenantUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
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

          {/* OAuth Config Tab */}
          <TabsContent value="oauth" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">OAuth Configuration</h2>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Link className="h-5 w-5 text-blue-600" />
                  <span>eWeLink Integration</span>
                </CardTitle>
                <CardDescription>Configure OAuth settings for eWeLink device integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">eWeLink Connection</h3>
                    <p className="text-sm text-gray-600">
                      {oauthConnected ? 'Your tenant is connected to eWeLink' : 'Connect your eWeLink account to manage devices'}
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      {oauthConnected ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${oauthConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {oauthConnected ? 'Connected and ready' : 'Not connected'}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={onConnectEWeLink}
                    variant={oauthConnected ? "outline" : "default"}
                    className={!oauthConnected ? "bg-gradient-to-r from-blue-600 to-indigo-600" : ""}
                  >
                    {oauthConnected ? 'Reconnect' : 'Connect Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Tab */}
          <TabsContent value="mcp" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">MCP Integration</h2>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>MCP Endpoint Configuration</CardTitle>
                <CardDescription>Your tenant's Model Context Protocol endpoint for AI integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4">About MCP</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    The Model Context Protocol (MCP) allows AI assistants like Claude, ChatGPT, and custom applications to interact with your eWeLink devices through natural language.
                  </p>
                  <div className="flex space-x-4">
                    <Button onClick={onCopyMcpUrl} variant="outline" className="bg-white">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy MCP URL
                    </Button>
                    <Button variant="outline" className="bg-white">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Endpoint
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">How to use your MCP endpoint:</h4>
                  <ol className="space-y-3 text-sm text-gray-700">
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span>Copy your MCP endpoint URL using the button above</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span>Add it to your AI assistant's MCP configuration</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span>Start controlling your devices through natural language</span>
                    </li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default TenantAdminDashboard;

