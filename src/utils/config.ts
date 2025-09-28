import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  // eWeLink OAuth configuration
  ewelink: {
    clientId: process.env.EWELINK_CLIENT_ID || '',
    clientSecret: process.env.EWELINK_CLIENT_SECRET || '',
    redirectUri: process.env.EWELINK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
    apiUrl: process.env.EWELINK_API_URL || 'https://eu-apia.coolkit.cc',
    oauthUrl: process.env.EWELINK_OAUTH_URL || 'https://c2ccdn.coolkit.cc'
  },
  
  // Frontend configuration
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Email configuration (if needed)
  email: {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || ''
  }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} environment variable is not set`);
  }
}
