import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [user, setUser] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [oauthConnected, setOauthConnected] = useState(false);
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  
  // Register form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: ''
  });
  
  const [showRegister, setShowRegister] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/verify');
      setUser(response.data.user);
      setIsLoggedIn(true);
      checkOAuthStatus();
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setIsLoggedIn(false);
    }
  };

  const checkOAuthStatus = async () => {
    try {
      const response = await axios.get('/api/oauth/status');
      setOauthConnected(response.data.connected);
    } catch (error) {
      console.error('OAuth status check failed:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/login', loginForm);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setIsLoggedIn(true);
      setSuccess('Login successful!');
      setLoginForm({ email: '', password: '' });
      
      checkOAuthStatus();
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/register', registerForm);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setIsLoggedIn(true);
      setSuccess('Registration successful!');
      setRegisterForm({ email: '', password: '' });
      setShowRegister(false);
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsLoggedIn(false);
    setOauthConnected(false);
    setDevices([]);
    setSuccess('Logged out successfully');
  };

  const connectEWeLink = async () => {
    try {
      const response = await axios.get('/api/oauth/authorize');
      window.location.href = response.data.oauth_url;
    } catch (error) {
      setError('Failed to initiate eWeLink connection');
    }
  };

  const disconnectEWeLink = async () => {
    try {
      await axios.post('/api/oauth/disconnect');
      setOauthConnected(false);
      setDevices([]);
      setSuccess('eWeLink account disconnected');
    } catch (error) {
      setError('Failed to disconnect eWeLink account');
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get('/api/tenant/devices');
      setDevices(response.data.devices);
      setSuccess(`Loaded ${response.data.devices.length} devices`);
    } catch (error) {
      if (error.response?.data?.code === 'EWELINK_NOT_CONNECTED') {
        setError('Please connect your eWeLink account first');
      } else {
        setError('Failed to fetch devices');
      }
    } finally {
      setLoading(false);
    }
  };

  const controlDevice = async (deviceId, params) => {
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`/api/tenant/devices/${deviceId}/control`, { params });
      setSuccess(`Device ${deviceId} controlled successfully`);
      // Refresh devices to get updated status
      setTimeout(fetchDevices, 1000);
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

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('oauth_success');
    const error = urlParams.get('oauth_error');
    
    if (success) {
      setSuccess('eWeLink account connected successfully!');
      setOauthConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setError(`OAuth error: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            eWeLink MCP Server
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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

            <form onSubmit={showRegister ? handleRegister : handleLogin} className="space-y-6">
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
                    value={showRegister ? registerForm.email : loginForm.email}
                    onChange={(e) => {
                      if (showRegister) {
                        setRegisterForm({ ...registerForm, email: e.target.value });
                      } else {
                        setLoginForm({ ...loginForm, email: e.target.value });
                      }
                    }}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    value={showRegister ? registerForm.password : loginForm.password}
                    onChange={(e) => {
                      if (showRegister) {
                        setRegisterForm({ ...registerForm, password: e.target.value });
                      } else {
                        setLoginForm({ ...loginForm, password: e.target.value });
                      }
                    }}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : (showRegister ? 'Register' : 'Sign in')}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <button
                onClick={() => setShowRegister(!showRegister)}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-500"
              >
                {showRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">eWeLink MCP Server</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
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

        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">eWeLink Integration</h2>
            
            {!oauthConnected ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Connect your eWeLink account to manage your smart home devices.</p>
                <button
                  onClick={connectEWeLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                >
                  Connect eWeLink Account
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-green-700 font-medium">eWeLink Connected</span>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={fetchDevices}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Refresh Devices'}
                    </button>
                    <button
                      onClick={disconnectEWeLink}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {devices.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Devices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {devices.map((device) => (
                        <div key={device.deviceid} className="bg-white p-4 rounded-lg shadow border">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{device.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              device.online ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {device.online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">Type: {device.type}</p>
                          
                          {device.params?.switch && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">
                                Status: {device.params.switch === 'on' ? 'On' : 'Off'}
                              </span>
                              <button
                                onClick={() => toggleSwitch(device)}
                                disabled={!device.online || loading}
                                className={`px-3 py-1 rounded text-sm font-medium disabled:opacity-50 ${
                                  device.params.switch === 'on'
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                              >
                                Turn {device.params.switch === 'on' ? 'Off' : 'On'}
                              </button>
                            </div>
                          )}
                          
                          {device.params?.bright && (
                            <div className="mt-2">
                              <span className="text-sm text-gray-700">
                                Brightness: {device.params.bright}%
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
