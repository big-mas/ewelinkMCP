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
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const productionOnlyVars = ['JWT_SECRET', 'ENCRYPTION_KEY'];

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    const message = `${envVar} environment variable is not set`;
    
    if (isProduction && productionOnlyVars.includes(envVar)) {
      // In production, critical variables must be set
      throw new Error(`CRITICAL: ${message}. Application cannot start in production without this variable.`);
    } else {
      // In development, just warn
      console.warn(`⚠️  Warning: ${message}`);
    }
  }
}

// Additional production-only validations
if (isProduction) {
  // Ensure JWT_SECRET is strong enough (at least 32 characters)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters in production');
  }
  
  // Ensure ENCRYPTION_KEY is proper length (64 hex characters = 32 bytes)
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
    console.warn('⚠️  Warning: ENCRYPTION_KEY should be 64 hex characters (32 bytes) for AES-256');
  }
  
  // Warn about default JWT secret
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('CRITICAL: Default JWT_SECRET detected in production. Change immediately!');
  }
  
  console.log('✅ Production environment validation passed');
}
