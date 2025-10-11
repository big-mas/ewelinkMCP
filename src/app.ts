import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './utils/config';
import { authRoutes } from './routes/auth';
import { mcpRoutes } from './routes/mcp';
import { oauthRoutes } from './routes/oauth';
import { tenantRoutes } from './routes/tenant';
import { globalAdminRoutes } from './routes/globalAdmin';
import { tenantAdminRoutes } from './routes/tenantAdmin';
import { tenantUserRoutes } from './routes/tenantUser';
import { enhancedMcpRoutes } from './routes/enhancedMcp';
import { auditMiddleware } from './middleware/audit';
import logger from './utils/logger';

const app = express();

// Trust proxy for deployment environments
app.set('trust proxy', true);

// Security middleware (CSP disabled for development)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting with proxy support
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development or configure proxy properly for production
  skip: () => process.env.NODE_ENV === 'development'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit middleware
app.use(auditMiddleware);

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, '../public')));

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
app.use('/api/enhanced-mcp', enhancedMcpRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/global-admin', globalAdminRoutes);
app.use('/api/tenant-admin', tenantAdminRoutes);
app.use('/api/tenant-user', tenantUserRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve frontend for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const indexPath = path.join(__dirname, '../public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      next();
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Application error: ${err.message}`, { stack: err.stack, path: req.path });
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

const PORT = config.port || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 eWeLink MCP Server running on port ${PORT}`);
    logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Server accessible at: http://0.0.0.0:${PORT}`);
  });
}

export { app };
