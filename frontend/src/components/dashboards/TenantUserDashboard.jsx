import React from 'react';
import { Home, LogOut, Copy, ExternalLink, Power, Zap, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function TenantUserDashboard({ 
  user, 
  onLogout, 
  devices, 
  oauthConnected, 
  onConnectEWeLink,
  onControlDevice,
  onCopyMcpUrl,
  loading 
}) {
  const onlineDevices = devices.filter(d => d.online).length;

  const toggleSwitch = (device) => {
    const currentState = device.params?.switch || 'off';
    const newState = currentState === 'on' ? 'off' : 'on';
    onControlDevice(device.deviceid, { switch: newState });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Dashboard</h1>
                <p className="text-xs text-gray-500">Smart Home Control</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500">User</p>
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
        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm p-1 rounded-lg">
            <TabsTrigger value="devices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Home className="h-4 w-4 mr-2" />
              My Devices
            </TabsTrigger>
            <TabsTrigger value="oauth" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              eWeLink
            </TabsTrigger>
            <TabsTrigger value="mcp" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              MCP Access
            </TabsTrigger>
          </TabsList>

          {/* Devices Tab */}
          <TabsContent value="devices" className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Total Devices</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Home className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{devices.length}</div>
                  <p className="text-xs text-gray-600 mt-1">Connected devices</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Online Devices</CardTitle>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{onlineDevices}</div>
                  <p className="text-xs text-gray-600 mt-1">Ready to control</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Connection</CardTitle>
                  <div className={`p-2 rounded-lg ${oauthConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Power className={`h-5 w-5 ${oauthConnected ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${oauthConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {oauthConnected ? 'Connected' : 'Disconnected'}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">eWeLink status</p>
                </CardContent>
              </Card>
            </div>

            {/* Device Grid */}
            {devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map((device) => (
                  <Card key={device.deviceid} className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900">{device.name}</CardTitle>
                          <CardDescription className="mt-1">{device.type || 'Smart Device'}</CardDescription>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                          device.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-600' : 'bg-red-600'} animate-pulse`}></div>
                          <span>{device.online ? 'Online' : 'Offline'}</span>
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {device.params?.switch && (
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Power</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {device.params.switch === 'on' ? 'Turned On' : 'Turned Off'}
                            </p>
                          </div>
                          <Button
                            onClick={() => toggleSwitch(device)}
                            disabled={!device.online || loading}
                            variant={device.params.switch === 'on' ? "default" : "outline"}
                            size="sm"
                            className={device.params.switch === 'on' 
                              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700" 
                              : ""}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {device.params.switch === 'on' ? 'Turn Off' : 'Turn On'}
                          </Button>
                        </div>
                      )}
                      
                      {device.params?.bright && (
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">Brightness</span>
                            <span className="text-lg font-bold text-yellow-600">{device.params.bright}%</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${device.params.bright}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {!device.params?.switch && !device.params?.bright && (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No controllable parameters
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="text-center py-16">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Home className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Devices Found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Connect your eWeLink account to start managing your smart home devices
                  </p>
                  <Button onClick={onConnectEWeLink} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg">
                    <Power className="h-4 w-4 mr-2" />
                    Connect eWeLink Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* eWeLink Tab */}
          <TabsContent value="oauth" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Power className="h-5 w-5 text-green-600" />
                  <span>eWeLink Integration</span>
                </CardTitle>
                <CardDescription>Connect your eWeLink account to access and control your smart devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-dashed border-green-300">
                    <h3 className="font-semibold text-gray-900 mb-3">Connection Status</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {oauthConnected ? (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : (
                          <XCircle className="h-8 w-8 text-red-600" />
                        )}
                        <div>
                          <p className={`font-medium ${oauthConnected ? 'text-green-900' : 'text-red-900'}`}>
                            {oauthConnected ? 'Connected and Ready' : 'Not Connected'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {oauthConnected 
                              ? 'Your eWeLink account is successfully connected' 
                              : 'Connect your account to start controlling devices'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={onConnectEWeLink}
                        variant={oauthConnected ? "outline" : "default"}
                        className={!oauthConnected ? "bg-gradient-to-r from-green-500 to-emerald-600" : ""}
                      >
                        {oauthConnected ? 'Reconnect' : 'Connect Account'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">What you can do:</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                        <span className="text-sm text-gray-700">Control all your eWeLink smart home devices</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                        <span className="text-sm text-gray-700">Monitor device status in real-time</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                        <span className="text-sm text-gray-700">Integrate with AI assistants via MCP</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Access Tab */}
          <TabsContent value="mcp" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>MCP Access</CardTitle>
                <CardDescription>Your personal MCP endpoint for AI assistant integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Personal MCP Endpoint</h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Use this unique URL to connect AI assistants like Claude, ChatGPT, or custom applications to your eWeLink devices.
                  </p>
                  <div className="flex space-x-4">
                    <Button onClick={onCopyMcpUrl} variant="outline" className="bg-white shadow-sm">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy My MCP URL
                    </Button>
                    <Button variant="outline" className="bg-white shadow-sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <span className="text-lg">🚀</span>
                    <span>How to use your MCP endpoint</span>
                  </h4>
                  <ol className="space-y-4">
                    <li className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">1</div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Copy your MCP endpoint URL</p>
                        <p className="text-sm text-gray-600 mt-1">Click the "Copy My MCP URL" button above to copy your unique endpoint</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">2</div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Configure your AI assistant</p>
                        <p className="text-sm text-gray-600 mt-1">Add the URL to your AI assistant's MCP configuration settings</p>
                      </div>
                    </li>
                    <li className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-bold">3</div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Start controlling devices</p>
                        <p className="text-sm text-gray-600 mt-1">Ask your AI assistant to control your devices using natural language</p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>💡 Tip:</strong> You can ask your AI assistant things like "Turn on the living room lights" or "What's the status of my devices?"
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

export default TenantUserDashboard;

