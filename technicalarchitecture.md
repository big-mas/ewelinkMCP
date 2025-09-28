# eWeLink MCP Server - Technical Architecture

## 🏗️ System Overview

The eWeLink MCP Server is implemented as a standalone Flask application that provides a comprehensive smart home management platform. The system integrates OAuth-based authentication with eWeLink devices and implements the Model Context Protocol (MCP) specification for seamless device control and automation.

## 📐 Architecture Patterns

### Monolithic Architecture
The system follows a monolithic architecture pattern where all components are deployed as a single application unit. This approach was chosen for simplicity of deployment and maintenance while providing all required functionality in a cohesive package.

### RESTful API Design
The application implements RESTful API principles with clear resource-based endpoints, appropriate HTTP methods, and standardized response formats. All API endpoints follow consistent naming conventions and return JSON responses.

### Model-View-Controller (MVC) Pattern
The application separates concerns through a clear MVC structure where Flask routes handle requests (Controller), SQLite database manages data (Model), and HTML templates serve the user interface (View).

---

## 🛠️ Technology Stack

### Core Framework
**Flask 2.3.3** serves as the primary web framework, providing lightweight and flexible web application development capabilities. Flask was selected for its simplicity, extensive ecosystem, and excellent documentation.

### Database Layer
**SQLite** provides the data persistence layer with automatic database initialization and schema management. The database stores user accounts, device information, and audit logs in a lightweight, file-based format that requires no additional database server installation.

### Authentication & Security
**PyJWT 2.8.0** handles JSON Web Token generation and validation for secure user authentication. **SHA-256 hashing** protects user passwords, while **secrets module** generates cryptographically secure state parameters for OAuth flows.

### HTTP Client
**Requests 2.31.0** manages all external HTTP communications, including eWeLink API integration and OAuth token exchanges. The library provides robust error handling and connection management.

### Cross-Origin Resource Sharing
**Flask-CORS 4.0.0** enables cross-origin requests, allowing the web interface to communicate with the API from different domains while maintaining security controls.

---

## 🗄️ Database Design

### Schema Architecture
The database implements a normalized relational schema with three primary entities that support the complete application functionality.

#### Users Table
The users table stores all user account information including authentication credentials and eWeLink integration tokens. The schema supports role-based access control through the role field and maintains OAuth tokens for seamless eWeLink integration.

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ewelink_access_token TEXT,
    ewelink_refresh_token TEXT,
    ewelink_user_id TEXT
)
```

#### Devices Table
The devices table maintains a registry of all connected eWeLink devices with their current status, parameters, and capabilities. This enables efficient device management and real-time status tracking.

```sql
CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    model TEXT,
    online BOOLEAN DEFAULT 0,
    params TEXT,
    capabilities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Audit Logs Table
The audit_logs table provides comprehensive activity tracking for security and compliance purposes. All user actions are logged with detailed information for troubleshooting and security analysis.

```sql
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## 🔐 Security Architecture

### Authentication Flow
The system implements JWT-based authentication with a secure token generation process. User credentials are validated against SHA-256 hashed passwords stored in the database. Upon successful authentication, a JWT token is generated with user information and a 7-day expiration period.

### Authorization Middleware
The `token_required` decorator provides centralized authorization control for protected endpoints. The middleware validates JWT tokens, extracts user information, and attaches user context to requests for downstream processing.

### OAuth Security
OAuth integration implements the authorization code flow with CSRF protection through secure state parameters. The system generates cryptographically secure state values and validates them during the callback process to prevent cross-site request forgery attacks.

### Data Protection
Sensitive data including OAuth tokens and user passwords are protected through industry-standard hashing and encryption techniques. The system implements parameterized SQL queries to prevent injection attacks and validates all user inputs.

---

## 🌐 API Architecture

### Endpoint Organization
The API follows RESTful principles with logical resource grouping and consistent naming conventions. All endpoints return JSON responses with appropriate HTTP status codes and error messages.

#### Authentication Endpoints
- `POST /api/auth/login` - User authentication with email/password credentials
- Returns JWT token and user information upon successful authentication

#### OAuth Integration Endpoints
- `GET /api/oauth/authorize` - Generates eWeLink OAuth authorization URL
- `GET /api/oauth/callback` - Handles OAuth callback with authorization code
- Implements complete OAuth 2.0 authorization code flow with state validation

#### MCP Protocol Endpoints
- `GET /api/mcp/discover` - Server discovery with protocol capabilities
- `POST /api/mcp/tools` - MCP tool execution for device operations
- Implements MCP specification version 2025-06-18 with JSON-RPC 2.0

#### System Endpoints
- `GET /api/health` - System health check and status information
- `GET /` - Serves the web interface application

### Response Format
All API responses follow a consistent JSON format with appropriate HTTP status codes. Error responses include descriptive messages and error codes for client-side handling.

---

## 🔌 Integration Architecture

### eWeLink API Integration
The system integrates with eWeLink cloud services through OAuth 2.0 authentication and RESTful API calls. Device control operations are proxied through the eWeLink API to maintain real-time synchronization with the eWeLink platform.

### MCP Protocol Implementation
The Model Context Protocol implementation provides standardized interfaces for smart home device interaction. The system exposes device capabilities through MCP tools that can be consumed by compatible clients and automation systems.

### Frontend Integration
The web interface is embedded directly within the Flask application as an HTML template with JavaScript functionality. This approach eliminates the need for separate frontend deployment while providing a complete user interface.

---

## 🚀 Deployment Architecture

### Standalone Deployment
The application is designed for standalone deployment as a single Python process. All dependencies are managed through pip and virtual environments, making deployment straightforward on any Python-compatible platform.

### Configuration Management
The system uses environment variables and configuration constants for deployment flexibility. Database paths, JWT secrets, and OAuth credentials can be configured without code changes.

### Process Management
The Flask application runs as a single process with the built-in WSGI server. For production deployments, the system can be easily integrated with production WSGI servers like Gunicorn or uWSGI.

---

## 📊 Performance Considerations

### Database Performance
SQLite provides excellent performance for the expected user load while maintaining simplicity. The database schema includes appropriate indexes on frequently queried fields like email addresses and device IDs.

### Memory Management
The application maintains minimal memory footprint by using efficient data structures and avoiding unnecessary data caching. Database connections are opened and closed for each operation to prevent connection leaks.

### Scalability Design
While implemented as a monolithic application, the architecture supports horizontal scaling through load balancing and database replication if needed for larger deployments.

---

## 🔧 Development Architecture

### Code Organization
The application follows a clear separation of concerns with distinct modules for authentication, OAuth integration, MCP protocol implementation, and database operations. This modular approach facilitates maintenance and future enhancements.

### Error Handling
Comprehensive error handling is implemented throughout the application with appropriate logging and user feedback. All exceptions are caught and converted to appropriate HTTP responses with descriptive error messages.

### Testing Strategy
The architecture supports unit testing through modular design and dependency injection. Database operations can be easily mocked for testing, and API endpoints can be tested independently.

---

## 🔄 Data Flow Architecture

### Request Processing Flow
1. HTTP requests are received by Flask routing system
2. Authentication middleware validates JWT tokens for protected endpoints
3. Business logic processes requests and interacts with database
4. External API calls are made to eWeLink services when needed
5. Responses are formatted and returned to clients

### OAuth Flow Architecture
1. User initiates OAuth authorization request
2. System generates secure state parameter and OAuth URL
3. User is redirected to eWeLink authorization server
4. eWeLink redirects to callback URL with authorization code
5. System exchanges code for access tokens and stores in database

### MCP Protocol Flow
1. MCP clients discover server capabilities through discovery endpoint
2. Clients request available tools and their descriptions
3. Tool execution requests are validated and processed
4. Device operations are performed through eWeLink API integration
5. Results are returned in MCP-compliant format

---

## 🛡️ Security Considerations

### Input Validation
All user inputs are validated and sanitized to prevent injection attacks and data corruption. The system implements both client-side and server-side validation for comprehensive protection.

### Token Management
JWT tokens include appropriate expiration times and are validated on every request. The system handles token expiration gracefully and provides clear error messages for authentication failures.

### CORS Policy
Cross-origin resource sharing is configured to allow necessary frontend-backend communication while maintaining security boundaries. The CORS policy can be adjusted for different deployment environments.

This technical architecture provides a robust foundation for the eWeLink MCP Server while maintaining simplicity and ease of deployment. The design supports the current functional requirements while providing flexibility for future enhancements and scaling needs.
