# eWeLink MCP Server - Deployment Guide

**Author**: Manus AI  
**Date**: September 28, 2025  
**Version**: 1.0.0

## Overview

This document provides comprehensive instructions for deploying and testing the multitenant eWeLink MCP Server with enhanced admin interfaces. The system supports three distinct user roles with role-based access control and professional UI components.

## System Architecture

### **Technology Stack**
- **Backend**: Node.js/TypeScript with Express.js
- **Frontend**: React with shadcn/ui components and Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT-based with bcrypt password hashing
- **UI Framework**: shadcn/ui components with Lucide icons

### **User Roles**
1. **Global Admin**: System-wide administration and tenant management
2. **Tenant Admin**: Tenant-specific user and configuration management
3. **Tenant User**: Personal device control and MCP access

## Prerequisites

### **System Requirements**
- Node.js 22.13.0 or higher
- npm or yarn package manager
- SQLite database support
- Modern web browser (Chrome, Firefox, Safari, Edge)

### **Environment Setup**
```bash
# Clone the repository
git clone <repository-url>
cd ewelinkMCP

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Database Setup

### **Initialize Database**
```bash
cd backend
npx prisma generate
npx prisma db push
```

### **Create Global Admin User**
```bash
# Run the admin creation script
node create-admin.js
```

**Default Global Admin Credentials:**
- Email: `admin@ewelinkMCP.local`
- Password: `admin123`

### **Create Test Data (Optional)**
```bash
# Create sample tenant and users
node create-unique-tenant.js
```

## Configuration

### **Environment Variables**
Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# eWeLink Configuration (Optional)
EWELINK_CLIENT_ID="your-ewelink-client-id"
EWELINK_CLIENT_SECRET="your-ewelink-client-secret"
EWELINK_REDIRECT_URI="http://localhost:3000/oauth/callback"
```

### **Frontend Configuration**
The frontend automatically uses Vite's proxy configuration to route API calls to the backend.

## Deployment

### **Development Mode**

**Start Backend Server:**
```bash
cd backend
npm run dev
```
Server runs on: `http://localhost:3000`

**Start Frontend Server:**
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### **Production Mode**

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Production Server:**
```bash
cd backend
npm run build
npm start
```

## Testing

### **User Interface Testing**

#### **Global Admin Dashboard**
1. Navigate to `http://localhost:5173`
2. Select "Global Admin" from user type dropdown
3. Login with: `admin@ewelinkMCP.local` / `admin123`
4. Test features:
   - Overview dashboard with system metrics
   - Tenant management (create, view, approve)
   - User management across all tenants
   - System settings and configuration

#### **Tenant Admin Dashboard**
1. Create a tenant through Global Admin interface
2. Logout and select "Tenant Admin"
3. Login with tenant admin credentials
4. Test features:
   - Tenant-specific overview
   - User management within tenant
   - OAuth configuration for eWeLink
   - MCP integration settings

#### **Tenant User Dashboard**
1. Create a user through Tenant Admin interface
2. Logout and select "Tenant User"
3. Login with user credentials
4. Test features:
   - Personal device dashboard
   - eWeLink account connection
   - MCP endpoint access and testing

### **API Testing**

#### **Authentication Endpoints**
```bash
# Global Admin Login
curl -X POST http://localhost:3000/api/global-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ewelinkMCP.local","password":"admin123"}'

# Tenant Admin Login
curl -X POST http://localhost:3000/api/tenant-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tenant.com","password":"password"}'
```

#### **Protected Endpoints**
```bash
# Get Tenants (Global Admin only)
curl -X GET http://localhost:3000/api/global-admin/tenants \
  -H "Authorization: Bearer <jwt-token>"

# Get Users (Tenant Admin)
curl -X GET http://localhost:3000/api/tenant-admin/users \
  -H "Authorization: Bearer <jwt-token>"
```

#### **Health Check**
```bash
curl -X GET http://localhost:3000/health
```

### **Security Testing**

#### **Access Control Validation**
- Test unauthorized access to protected endpoints
- Verify JWT token validation
- Confirm role-based access restrictions
- Test CORS configuration

#### **Input Validation**
- Test form validation on all interfaces
- Verify SQL injection protection
- Test XSS prevention measures

## Features

### **Global Admin Features**
- **System Overview**: Real-time metrics and system health
- **Tenant Management**: Create, approve, suspend, and delete tenants
- **User Oversight**: View and manage users across all tenants
- **System Configuration**: Global settings and security policies
- **Audit Logging**: Track all administrative actions

### **Tenant Admin Features**
- **Tenant Dashboard**: Tenant-specific metrics and activity
- **User Management**: Add, edit, and manage tenant users
- **OAuth Configuration**: Setup eWeLink integration
- **MCP Settings**: Configure MCP endpoints and permissions
- **Tenant Settings**: Customize tenant-specific configurations

### **Tenant User Features**
- **Device Dashboard**: View and control connected eWeLink devices
- **eWeLink Integration**: Connect and manage eWeLink account
- **MCP Access**: Personal MCP endpoint for AI assistant integration
- **Profile Management**: Update personal settings and preferences

## Troubleshooting

### **Common Issues**

#### **Database Connection Errors**
```bash
# Reset database
cd backend
rm prisma/dev.db
npx prisma db push
node create-admin.js
```

#### **Frontend Build Errors**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### **Authentication Issues**
- Verify JWT_SECRET is set in environment variables
- Check token expiration settings
- Ensure proper CORS configuration

### **Logs and Debugging**
- Backend logs: Console output from `npm run dev`
- Frontend logs: Browser developer console
- Database logs: Prisma query logs (enable in development)

## Security Considerations

### **Production Deployment**
1. **Environment Variables**: Use secure, randomly generated JWT secrets
2. **HTTPS**: Deploy with SSL/TLS certificates
3. **Database**: Use production-grade database (PostgreSQL/MySQL)
4. **Rate Limiting**: Configure appropriate rate limits
5. **CORS**: Restrict origins to production domains
6. **Monitoring**: Implement logging and monitoring solutions

### **Best Practices**
- Regular security updates for dependencies
- Implement proper backup strategies
- Use environment-specific configurations
- Monitor for suspicious activities
- Regular security audits and penetration testing

## Support and Maintenance

### **Regular Maintenance**
- Update dependencies monthly
- Monitor system performance
- Review audit logs regularly
- Backup database daily
- Test disaster recovery procedures

### **Monitoring**
- Health endpoint: `/health`
- Application metrics via logs
- Database performance monitoring
- User activity tracking

## Conclusion

The eWeLink MCP Server provides a comprehensive, secure, and scalable solution for multitenant IoT device management with AI assistant integration. The role-based architecture ensures proper access control while the modern UI provides an excellent user experience across all user types.

For additional support or questions, please refer to the technical documentation or contact the development team.
