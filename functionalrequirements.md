# eWeLink MCP Server - Functional Requirements

## 📋 Overview

The eWeLink MCP Server is a comprehensive smart home management platform that implements the Model Context Protocol (MCP) specification for seamless integration with eWeLink smart devices. The system provides OAuth-based authentication, device management, and protocol-compliant endpoints for smart home automation.

---

## 🎯 Core Functional Requirements

### 1. User Authentication & Authorization

#### 1.1 User Management
- **FR-001**: System shall support user registration with email and password
- **FR-002**: System shall authenticate users using JWT tokens with 7-day expiration
- **FR-003**: System shall support role-based access control (admin, user)
- **FR-004**: System shall hash passwords using SHA-256 for secure storage
- **FR-005**: System shall maintain user sessions with automatic token refresh

#### 1.2 Admin Functions
- **FR-006**: Admin users shall have access to system-wide configuration
- **FR-007**: Admin users shall be able to view all user accounts and devices
- **FR-008**: System shall create default admin account (admin@ewelinkMCP.local) on first startup

### 2. eWeLink OAuth Integration

#### 2.1 OAuth Flow
- **FR-009**: System shall implement OAuth 2.0 authorization code flow for eWeLink integration
- **FR-010**: System shall generate secure state parameters for CSRF protection
- **FR-011**: System shall provide callback URL endpoint for OAuth authorization
- **FR-012**: System shall exchange authorization codes for access/refresh tokens
- **FR-013**: System shall store eWeLink tokens securely in user profiles

#### 2.2 OAuth Endpoints
- **FR-014**: `GET /api/oauth/authorize` - Generate OAuth authorization URL
- **FR-015**: `GET /api/oauth/callback` - Handle OAuth callback with code and state
- **FR-016**: System shall validate state parameters to prevent CSRF attacks
- **FR-017**: System shall handle OAuth errors gracefully with user feedback

### 3. Model Context Protocol (MCP) Implementation

#### 3.1 Protocol Compliance
- **FR-018**: System shall implement MCP specification version 2025-06-18
- **FR-019**: System shall support JSON-RPC 2.0 protocol for MCP communication
- **FR-020**: System shall provide server discovery endpoint with capabilities
- **FR-021**: System shall implement tools, resources, and prompts capabilities

#### 3.2 MCP Endpoints
- **FR-022**: `GET /api/mcp/discover` - Server discovery with protocol information
- **FR-023**: `POST /api/mcp/tools` - Execute MCP tools for device operations
- **FR-024**: System shall support the following MCP tools:
  - `list_devices` - List all connected eWeLink devices
  - `control_device` - Control device parameters (on/off, settings)
  - `get_device_status` - Retrieve current device status and parameters

#### 3.3 Device Management
- **FR-025**: System shall maintain device registry with eWeLink device information
- **FR-026**: System shall track device online/offline status
- **FR-027**: System shall store device parameters and capabilities
- **FR-028**: System shall provide real-time device control through MCP tools

### 4. Web Interface

#### 4.1 User Interface
- **FR-029**: System shall provide responsive web interface for all device types
- **FR-030**: System shall support user type selection (Admin, Tenant User)
- **FR-031**: System shall provide login form with email/password authentication
- **FR-032**: System shall display user dashboard after successful authentication

#### 4.2 Dashboard Features
- **FR-033**: Dashboard shall provide Overview tab with system information
- **FR-034**: Dashboard shall provide OAuth tab for eWeLink account connection
- **FR-035**: Dashboard shall provide MCP tab for protocol testing
- **FR-036**: System shall allow real-time testing of OAuth and MCP endpoints
- **FR-037**: System shall provide logout functionality with session cleanup

### 5. Data Management

#### 5.1 Database Operations
- **FR-038**: System shall use SQLite database for data persistence
- **FR-039**: System shall automatically initialize database schema on startup
- **FR-040**: System shall maintain the following data entities:
  - Users (id, email, password, role, tokens, timestamps)
  - Devices (id, device_id, name, type, model, status, parameters)
  - Audit Logs (id, user_id, action, resource, details, timestamp)

#### 5.2 Data Security
- **FR-041**: System shall encrypt sensitive data (OAuth tokens, passwords)
- **FR-042**: System shall maintain audit logs for all user actions
- **FR-043**: System shall implement data validation for all inputs
- **FR-044**: System shall prevent SQL injection through parameterized queries

### 6. API Endpoints

#### 6.1 Authentication API
- **FR-045**: `POST /api/auth/login` - User authentication with email/password
- **FR-046**: Authentication shall return JWT token and user information
- **FR-047**: System shall validate credentials against database records

#### 6.2 Health Check
- **FR-048**: `GET /api/health` - System health status endpoint
- **FR-049**: Health check shall return server status, timestamp, and version

#### 6.3 Error Handling
- **FR-050**: System shall return appropriate HTTP status codes for all responses
- **FR-051**: System shall provide descriptive error messages for failed operations
- **FR-052**: System shall log errors for debugging and monitoring

### 7. Security Requirements

#### 7.1 Authentication Security
- **FR-053**: System shall require Bearer token authentication for protected endpoints
- **FR-054**: System shall validate JWT tokens on every protected request
- **FR-055**: System shall handle token expiration gracefully
- **FR-056**: System shall implement CORS policy for cross-origin requests

#### 7.2 Data Protection
- **FR-057**: System shall protect against common web vulnerabilities (XSS, CSRF)
- **FR-058**: System shall validate and sanitize all user inputs
- **FR-059**: System shall use secure HTTP headers and configurations

### 8. Integration Requirements

#### 8.1 eWeLink API Integration
- **FR-060**: System shall integrate with eWeLink cloud API for device control
- **FR-061**: System shall handle eWeLink API rate limits and errors
- **FR-062**: System shall synchronize device states with eWeLink platform
- **FR-063**: System shall support multiple device types (switches, fans, sensors)

#### 8.2 MCP Client Compatibility
- **FR-064**: System shall be compatible with standard MCP clients
- **FR-065**: System shall provide proper MCP protocol responses
- **FR-066**: System shall support MCP session management
- **FR-067**: System shall handle concurrent MCP requests

---

## 🔄 User Workflows

### Workflow 1: User Authentication
1. User accesses web interface
2. User selects user type (Admin/User)
3. User enters email and password
4. System validates credentials
5. System generates JWT token
6. User is redirected to dashboard

### Workflow 2: eWeLink OAuth Setup
1. Authenticated user navigates to OAuth tab
2. User clicks "Connect eWeLink Account"
3. System generates OAuth URL with state parameter
4. User is redirected to eWeLink authorization
5. eWeLink redirects to callback URL with code
6. System exchanges code for access tokens
7. Tokens are stored in user profile

### Workflow 3: Device Control via MCP
1. MCP client discovers server capabilities
2. Client requests available tools
3. Client calls `list_devices` tool
4. System returns connected eWeLink devices
5. Client calls `control_device` with parameters
6. System executes device control via eWeLink API
7. System returns operation result

---

## 📊 Performance Requirements

- **PR-001**: System shall respond to API requests within 2 seconds
- **PR-002**: System shall support up to 100 concurrent users
- **PR-003**: System shall handle up to 1000 devices per user account
- **PR-004**: Database operations shall complete within 500ms
- **PR-005**: OAuth callback processing shall complete within 5 seconds

---

## 🔧 Operational Requirements

- **OR-001**: System shall run on standard web hosting environments
- **OR-002**: System shall support automatic database initialization
- **OR-003**: System shall provide comprehensive logging for troubleshooting
- **OR-004**: System shall handle graceful shutdown and startup
- **OR-005**: System shall support configuration through environment variables
