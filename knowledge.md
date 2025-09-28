# eWeLink MCP Server - Project Knowledge Base

**Author**: Manus AI  
**Date**: September 28, 2025  
**Version**: 1.0.0

This document contains the comprehensive rules, constraints, and knowledge about the eWeLink MCP Server project derived from development experience and requirements.

## 🔧 **Technical Rules & Constraints**

### **Technology Stack Requirements**
- **Node.js/TypeScript ONLY** - No Python allowed under any circumstances
- **Single Repository Structure** - Frontend + backend combined in one repo
- **React Frontend** with shadcn/ui components for consistency
- **Prisma ORM** with SQLite database for development
- **JWT Authentication** system for security
- **MCP 2025-06-18 Specification** compliance mandatory

### **Development Workflow Rules**
- **Create branch for each change** and test before merging to main
- **Preserve existing data** during all updates and migrations
- **Use shadcn/ui components** exclusively for frontend consistency
- **Maintain professional styling** with Tailwind CSS
- **Test all changes** before considering them complete
- **Document all major changes** in appropriate files

### **Code Quality Standards**
- **TypeScript** for type safety throughout the project
- **Clean architecture** with proper separation of concerns
- **Proper error handling** at all levels of the application
- **Maintainable code** structure and organization
- **Consistent naming conventions** across all files
- **Comprehensive input validation** on all endpoints

## 👥 **User Role Architecture**

### **Three Distinct User Types**
1. **Global Admin** - System-wide administration and oversight
2. **Tenant Admin** - Tenant-specific management and configuration
3. **Tenant User** - Personal device control and MCP access

### **Role-Based Features Requirements**
- **Different dashboards** for each user type with unique layouts
- **Distinct branding** and visual identity per role (colors, icons)
- **Proper access control** and API endpoint separation
- **Role-specific functionality** and permissions enforcement
- **No cross-role access** without proper authorization
- **Clear visual distinction** between user interfaces

### **User Interface Specifications**
- **Global Admin**: System metrics, tenant management, user oversight
- **Tenant Admin**: User management, OAuth config, MCP settings
- **Tenant User**: Device dashboard, eWeLink connection, MCP access

## 🏗️ **System Architecture Knowledge**

### **Database Schema Requirements**
- **Multitenant support** with proper data isolation between tenants
- **Global Admins** table for system administrators
- **Tenants** table with approval workflow and status management
- **Tenant Admins** and **Tenant Users** with proper tenant relationships
- **Audit Logs** for comprehensive activity tracking
- **Foreign key constraints** to maintain data integrity
- **Unique constraints** on critical fields (email, domain)

### **API Structure Standards**
- `/api/global-admin/*` - Global administration endpoints
- `/api/tenant-admin/*` - Tenant administration endpoints
- `/api/tenant-user/*` - User operation endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/mcp/*` - MCP protocol endpoints
- **JWT-based authentication** for all protected routes
- **Role validation middleware** for proper access control
- **Input validation** on all request bodies
- **Consistent error response** format

### **Authentication & Security Rules**
- **JWT tokens** with configurable expiration times
- **bcrypt password hashing** with minimum 12 salt rounds
- **Role-based access control** strictly enforced
- **No password storage** in plain text ever
- **Secure session management** with proper token handling
- **CORS configuration** properly configured for security

## 🎨 **UI/UX Requirements**

### **Design Principles**
- **Professional appearance** with modern, clean design
- **Enhanced UI components** using shadcn/ui exclusively
- **Responsive layout** with proper breakpoints for all devices
- **Role-specific color schemes** and branding elements
- **Intuitive navigation** with tabbed interfaces
- **Consistent spacing** and typography throughout
- **Accessibility compliance** with proper contrast and focus states

### **User Experience Standards**
- **Seamless login/logout** functionality across all user types
- **Proper state management** for user type selection and persistence
- **Professional error handling** with clear, actionable messages
- **Success notifications** and user feedback for all actions
- **Loading states** for all asynchronous operations
- **Form validation** with real-time feedback

### **Component Requirements**
- **shadcn/ui components** for all UI elements
- **Tailwind CSS** for styling and layout
- **Lucide icons** for consistent iconography
- **Custom styling** only when shadcn/ui components insufficient
- **Responsive design** patterns throughout

## 🔒 **Security Requirements**

### **Authentication & Authorization**
- **JWT tokens** with proper signing and verification
- **Role-based permissions** strictly enforced at API level
- **Password complexity** requirements for all user types
- **Session timeout** and token expiration handling
- **Secure password reset** functionality when implemented
- **Multi-factor authentication** consideration for future

### **Data Protection Standards**
- **Tenant data isolation** in multitenant architecture
- **Encrypted sensitive data** storage where applicable
- **Audit logging** for all administrative and sensitive actions
- **Secure error responses** without information leakage
- **Input sanitization** to prevent injection attacks
- **Rate limiting** on authentication endpoints

### **API Security Rules**
- **Authorization headers** required for protected endpoints
- **Token validation** on every protected request
- **Role checking** before allowing access to resources
- **CORS policy** properly configured for production
- **Request size limits** to prevent abuse
- **Error handling** that doesn't expose system internals

## 📋 **Functional Requirements**

### **Global Admin Capabilities**
- **Tenant management** (create, approve, suspend, delete)
- **Cross-tenant user oversight** and management
- **System configuration** and global settings
- **Dashboard with system metrics** and health monitoring
- **Audit log review** and system monitoring
- **User role management** and permissions

### **Tenant Admin Capabilities**
- **User management** within tenant scope only
- **OAuth configuration** for eWeLink integration
- **MCP endpoint** configuration and management
- **Tenant-specific dashboard** and metrics
- **Tenant settings** and customization
- **User activity monitoring** within tenant

### **Tenant User Capabilities**
- **Device dashboard** with eWeLink integration
- **Personal MCP endpoint** for AI assistant integration
- **Account management** and profile settings
- **eWeLink account connection** and device control
- **Personal activity history** and usage statistics
- **Profile customization** and preferences

## 🚀 **Deployment & Testing Knowledge**

### **Environment Setup Requirements**
- **Development servers** on localhost (backend: 3000, frontend: 5173)
- **Environment variables** properly configured for all environments
- **Database initialization** with proper seed data
- **PostCSS configuration** for Tailwind CSS processing
- **Vite proxy configuration** for API routing
- **CORS configuration** for cross-origin requests

### **Testing Requirements**
- **Functional testing** of all user interfaces and workflows
- **Security testing** of API endpoints and authentication
- **Role-based access** validation and boundary testing
- **Authentication flow** testing for all user types
- **Error handling** verification and edge case testing
- **Performance testing** for acceptable response times

### **Deployment Standards**
- **Production environment** variables properly secured
- **Database migration** procedures documented
- **Backup and recovery** procedures established
- **Monitoring and logging** systems in place
- **SSL/TLS certificates** for production deployment
- **Load balancing** considerations for scale

## 📚 **Documentation Standards**

### **Required Documentation Files**
- **functionalrequirements.md** - Complete functional specification
- **technicalarchitecture.md** - System architecture documentation
- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
- **PROJECT_COMPLETION_SUMMARY.md** - Project status and achievements
- **knowledge.md** - This comprehensive knowledge base
- **README.md** - Project overview and quick start guide

### **Documentation Quality Standards**
- **Clear, professional writing** with proper formatting
- **Step-by-step instructions** for all procedures
- **Code examples** and API usage demonstrations
- **Troubleshooting sections** for common issues
- **Security considerations** prominently documented
- **Regular updates** to reflect current system state

## 🔄 **Development Process Rules**

### **Version Control Standards**
- **Meaningful commit messages** describing changes
- **Branch naming conventions** for feature development
- **Pull request reviews** before merging to main
- **Tag releases** with semantic versioning
- **Maintain clean history** with proper merge strategies

### **Code Review Requirements**
- **Security review** for all authentication changes
- **Performance review** for database queries
- **UI/UX review** for frontend changes
- **Documentation review** for accuracy and completeness
- **Testing verification** before approval

### **Maintenance Procedures**
- **Regular dependency updates** with security focus
- **Database maintenance** and optimization
- **Log rotation** and cleanup procedures
- **Performance monitoring** and optimization
- **Security audit** procedures and schedules

## 🎯 **Success Criteria**

### **Technical Success Metrics**
- **All user interfaces** functional and professional
- **Authentication system** secure and reliable
- **Role-based access** properly enforced
- **API endpoints** responding correctly
- **Database operations** performing efficiently
- **Error handling** graceful and informative

### **User Experience Success Metrics**
- **Intuitive navigation** across all user types
- **Professional appearance** meeting modern standards
- **Responsive design** working on all devices
- **Fast load times** and smooth interactions
- **Clear feedback** for all user actions
- **Accessibility compliance** for inclusive design

### **Security Success Metrics**
- **No unauthorized access** to protected resources
- **Proper data isolation** between tenants
- **Secure authentication** with strong passwords
- **Audit trail** for all administrative actions
- **Error messages** not revealing sensitive information
- **Input validation** preventing malicious requests

This knowledge base serves as the definitive guide for understanding, maintaining, and extending the eWeLink MCP Server project. All future development should adhere to these established rules and standards to ensure consistency, security, and quality.
