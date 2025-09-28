# eWeLink MCP Server - Integrated Solution

A complete multitenant eWeLink MCP (Model Context Protocol) server with integrated frontend and backend in a single Node.js/TypeScript application.

## 🏗️ Architecture

This is a **single integrated solution** that combines:
- **Backend API** - Node.js/TypeScript with Express
- **Frontend UI** - Vanilla JavaScript with modern CSS (served by backend)
- **Database** - SQLite with Prisma ORM
- **Authentication** - JWT-based with role-based access control

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Setup

```bash
# Clone the repository
git clone https://github.com/big-mas/ewelinkMCP.git
cd ewelinkMCP/integrated-app

# Install dependencies
npm install

# Setup database and demo data
npm run setup

# Start the application
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔐 Demo Credentials

### Global Admin
- **Email**: `admin@ewelinkMCP.local`
- **Password**: `admin123`
- **Access**: Complete system administration

### Tenant Admin (Demo Company)
- **Email**: `admin@demo.company.com`
- **Password**: `demo123`
- **Access**: Tenant management and OAuth configuration

### Tenant Admin (Acme Corporation)
- **Email**: `admin@acme.corp.com`
- **Password**: `acme123`
- **Access**: Tenant management and OAuth configuration

## 📁 Project Structure

```
integrated-app/
├── src/
│   ├── app.ts                 # Main application entry point
│   ├── public/
│   │   └── index.html         # Frontend application
│   ├── routes/                # API routes
│   │   ├── globalAdmin.ts     # Global admin endpoints
│   │   ├── tenantAdmin.ts     # Tenant admin endpoints
│   │   ├── oauth.ts           # OAuth integration
│   │   └── enhancedMcp.ts     # MCP endpoints
│   ├── services/              # Business logic
│   │   ├── globalAdminService.ts
│   │   ├── tenantAdminService.ts
│   │   └── ewelinkService.ts
│   ├── middleware/            # Express middleware
│   │   ├── auth.ts            # Authentication
│   │   ├── audit.ts           # Audit logging
│   │   └── validation.ts      # Request validation
│   ├── utils/                 # Utilities
│   │   ├── encryption.ts      # Password hashing
│   │   └── config.ts          # Configuration
│   └── scripts/               # Database scripts
│       └── createCompleteDemoData.ts
├── prisma/
│   └── schema.prisma          # Database schema
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── .env                       # Environment variables
```

## 🎯 Features

### Multi-Role Authentication
- **Global Admin**: System-wide administration
- **Tenant Admin**: Tenant-specific management
- **Tenant User**: Device control and MCP access

### Professional UI
- Modern responsive design
- Role-based dashboards
- Real-time data display
- Professional styling with CSS Grid/Flexbox

### OAuth Integration
- Unique callback URLs per tenant
- eWeLink OAuth app configuration
- Secure credential management

### MCP Support
- Model Context Protocol 2025-06-18 compliance
- Unique endpoints per user per tenant
- AI assistant integration ready

### Security
- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Audit logging
- CORS protection
- Helmet security headers

## 🛠️ Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Database operations
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio

# Setup with demo data
npm run setup              # Complete setup with demo data
npm run seed               # Create demo data only
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-here"
FRONTEND_URL="http://localhost:3000"
EWELINK_CLIENT_ID="your-ewelink-client-id"
EWELINK_CLIENT_SECRET="your-ewelink-client-secret"
```

## 🌐 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/global-admin/login` - Global admin login
- `POST /api/tenant-admin/login` - Tenant admin login

### Global Admin Endpoints
- `GET /api/global-admin/tenants` - List all tenants
- `POST /api/global-admin/tenants` - Create tenant
- `PUT /api/global-admin/tenants/:id/pause` - Pause tenant
- `PUT /api/global-admin/tenants/:id/resume` - Resume tenant
- `GET /api/global-admin/users` - List all users

### Tenant Admin Endpoints
- `GET /api/tenant-admin/users` - List tenant users
- `POST /api/tenant-admin/oauth-config` - Save OAuth configuration
- `POST /api/tenant-admin/oauth-test` - Test OAuth connection

### MCP Endpoints
- `GET /api/enhanced-mcp/discover` - Discover user's MCP endpoint
- `POST /mcp/:tenantId/:userId` - User-specific MCP endpoint

## 🔧 Configuration

### eWeLink Integration

1. Create an OAuth app at [eWeLink Developer Console](https://dev.ewelink.cc/)
2. Use the tenant-specific callback URL provided in the admin interface
3. Configure Client ID and Client Secret in the tenant admin dashboard

### MCP Integration

Each user gets a unique MCP endpoint:
```
https://your-domain.com/mcp/{tenantId}/{userId}
```

Use this URL in AI assistants like Claude, ChatGPT, or custom applications.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the demo credentials and setup instructions

---

**Built with ❤️ using Node.js, TypeScript, and modern web technologies**
