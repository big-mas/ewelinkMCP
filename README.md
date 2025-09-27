# eWeLink MCP Server

A comprehensive Model Context Protocol (MCP) server implementation for eWeLink smart home devices, built with Node.js/TypeScript and React.

## 🚀 Features

- **Full MCP Protocol Support**: Complete implementation of MCP 2025-06-18 specification
- **eWeLink Integration**: OAuth-based authentication and device control
- **Device Management**: List, control, and monitor eWeLink smart home devices
- **Web Interface**: Modern React-based frontend for device management
- **TypeScript/Node.js**: Full-stack TypeScript implementation
- **Secure Authentication**: JWT-based user authentication with audit logging
- **Real-time Control**: Direct device control through eWeLink API

## 🏗️ Architecture

```
ewelinkMCP/
├── backend/          # Node.js/TypeScript backend
│   ├── src/
│   │   ├── routes/   # API routes (auth, mcp, oauth, tenant)
│   │   ├── services/ # Business logic (eWeLink, MCP)
│   │   ├── middleware/ # Auth, audit, validation
│   │   ├── types/    # TypeScript definitions
│   │   └── utils/    # Configuration and utilities
│   ├── prisma/       # Database schema
│   └── dist/         # Compiled JavaScript
├── frontend/         # React frontend
│   ├── src/          # React components and logic
│   └── dist/         # Built frontend assets
└── shared/           # Shared types and utilities
```

## 🛠️ Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **Prisma ORM** with SQLite database
- **JWT** for authentication
- **Axios** for HTTP requests
- **Jest** for testing

### Frontend
- **React 18** with hooks
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Axios** for API communication

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- eWeLink developer account (for OAuth credentials)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/big-mas/ewelinkMCP.git
cd ewelinkMCP
npm run setup
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# eWeLink OAuth Configuration
EWELINK_CLIENT_ID=your-ewelink-client-id
EWELINK_CLIENT_SECRET=your-ewelink-client-secret
EWELINK_REDIRECT_URI=http://localhost:3000/api/oauth/callback
```

### 3. Database Setup

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 4. Development

Start both backend and frontend in development mode:

```bash
npm run dev
```

Or start them separately:

```bash
# Backend (Terminal 1)
npm run dev:backend

# Frontend (Terminal 2)
npm run dev:frontend
```

### 5. Production Build

```bash
npm run build
npm start
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/verify` - Verify JWT token

### OAuth (eWeLink)
- `GET /api/oauth/authorize` - Initiate eWeLink OAuth
- `GET /api/oauth/callback` - OAuth callback handler
- `GET /api/oauth/status` - Check OAuth connection status
- `POST /api/oauth/disconnect` - Disconnect eWeLink account

### Device Management
- `GET /api/tenant/devices` - List user's devices
- `GET /api/tenant/devices/:id` - Get specific device
- `POST /api/tenant/devices/:id/control` - Control device
- `GET /api/tenant/devices/:id/status` - Get device status

### MCP Protocol
- `POST /api/mcp` - MCP JSON-RPC endpoint
- `GET /api/mcp/info` - MCP server information
- `GET /api/mcp/health` - MCP service health check

## 🔌 MCP Integration

The server implements the full MCP 2025-06-18 specification with the following capabilities:

### Tools
- `list_devices` - List all eWeLink devices
- `get_device` - Get specific device details
- `control_device` - Control device parameters
- `get_device_status` - Get current device status

### Resources
- `ewelink://devices` - JSON resource with all devices

### Prompts
- `device_control_help` - Interactive help for device control

### Example MCP Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "control_device",
    "arguments": {
      "deviceId": "1000abcdef",
      "params": {
        "switch": "on"
      }
    }
  }
}
```

## 🔐 eWeLink OAuth Setup

1. Register at [eWeLink Developer Portal](https://dev.ewelink.cc/)
2. Create a new application
3. Configure redirect URI: `http://localhost:3000/api/oauth/callback`
4. Copy Client ID and Client Secret to your `.env` file

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Deployment

### Using Node.js

```bash
npm run build
NODE_ENV=production npm start
```

### Using Docker

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

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./production.db"
JWT_SECRET=your-production-jwt-secret
EWELINK_CLIENT_ID=your-production-client-id
EWELINK_CLIENT_SECRET=your-production-client-secret
EWELINK_REDIRECT_URI=https://yourdomain.com/api/oauth/callback
FRONTEND_URL=https://yourdomain.com
```

## 🔍 Troubleshooting

### Common Issues

1. **eWeLink OAuth fails**
   - Verify Client ID and Secret
   - Check redirect URI matches exactly
   - Ensure eWeLink app is approved

2. **Database connection errors**
   - Check DATABASE_URL format
   - Run `npx prisma generate` and `npx prisma db push`

3. **CORS issues**
   - Verify FRONTEND_URL in environment variables
   - Check proxy configuration in Vite

### Debug Mode

Enable debug logging:

```bash
DEBUG=ewelink-mcp:* npm run dev
```

## 📚 Documentation

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [eWeLink API Documentation](https://coolkit-technologies.github.io/eWeLink-API/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [eWeLink](https://ewelink.cc/) for the smart home platform
- [Prisma](https://www.prisma.io/) for the excellent ORM
- [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) for the frontend tools

## 📞 Support

For support and questions:

- Create an issue on GitHub
- Check the [documentation](docs/)
- Review the [troubleshooting guide](#troubleshooting)

---

**Built with ❤️ for the smart home community**
