import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './utils/config';
import { authRoutes } from './routes/auth';
import { mcpRoutes } from './routes/mcp';
import { enhancedMcpRoutes } from './routes/enhancedMcp';
import { oauthRoutes } from './routes/oauth';
import { tenantRoutes } from './routes/tenant';
import { globalAdminRoutes } from './routes/globalAdmin';
import { tenantAdminRoutes } from './routes/tenantAdmin';
import { tenantUserRoutes } from './routes/tenantUser';
import { enhancedOAuthRoutes } from './routes/enhancedOAuth';
import { auditMiddleware } from './middleware/audit';
import { MCPScheduler } from './utils/mcpScheduler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit middleware
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/mcp', enhancedMcpRoutes); // MCP HTTP Transport (2025-06-18)
app.use('/api/oauth', oauthRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/global-admin', globalAdminRoutes);
app.use('/api/tenant-admin', tenantAdminRoutes);
app.use('/api/users', tenantUserRoutes);
app.use('/api/oauth', enhancedOAuthRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/mcp')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.port || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 eWeLink MCP Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start MCP session cleanup scheduler
    MCPScheduler.start();
  });
}

export { app };
