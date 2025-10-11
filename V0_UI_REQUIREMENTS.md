# V0 Enhanced UI Requirements

## Project Overview
eWeLink MCP Server - Multi-tenant smart home management platform with Model Context Protocol integration.

## Technology Stack
- **React 18** with hooks
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Lucide React** icons
- **Axios** for API communication
- **Vite** for build tooling

## Design System

### Color Scheme
- **Global Admin**: Indigo theme (`indigo-600`, `indigo-700`)
- **Tenant Admin**: Blue theme (`blue-600`, `blue-700`)
- **Tenant User**: Green theme (`green-600`, `green-700`)
- **Success**: `green-50`, `green-600`, `green-800`
- **Error**: `red-50`, `red-600`, `red-800`
- **Background**: `gray-50`, `white`

### Typography
- System font stack
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- Text sizes: xs, sm, base, lg, xl, 2xl, 3xl

## Component Requirements

### 1. Login Screen
**Purpose**: Unified authentication for all user types

**Requirements**:
- Gradient background (blue-50 to indigo-100)
- Centered card with shadow
- Shield icon at top
- Title: "eWeLink MCP Server"
- Subtitle: "Sign in to your account"
- User type selector dropdown:
  - Tenant User
  - Tenant Admin
  - Global Admin
- Email input field
- Password input field
- Sign in button with loading state
- Alert messages (success/error)
- Fully responsive

**Features**:
- Form validation
- Loading states
- Error handling
- Auto-focus on first field
- Enter key submission

---

### 2. Global Admin Dashboard
**Purpose**: System-wide administration and oversight

**Visual Identity**:
- Primary color: Indigo
- Icon: Shield
- Title: "Global Admin Dashboard"

**Tabs**:
1. **Overview Tab**:
   - 4 stat cards in grid:
     - Total Tenants (with active count)
     - Pending Approvals (tenants needing approval)
     - Total Users (across all tenants)
     - System Status (healthy indicator)
   - Recent Activity card showing latest 5 tenants

2. **Tenants Tab**:
   - "Create Tenant" button with Plus icon
   - Data table with columns:
     - Tenant (name + domain)
     - Status (badge: active/pending/suspended)
     - Users (count)
     - Created (date)
     - Actions (Approve/Suspend buttons based on status)
   - Modal form for creating tenant:
     - Tenant Name (required)
     - Domain
     - eWeLink Client ID
     - eWeLink Client Secret

3. **Users Tab**:
   - User management table
   - Cross-tenant user oversight
   - (Coming soon placeholder acceptable)

4. **Settings Tab**:
   - System configuration
   - (Coming soon placeholder acceptable)

**Features**:
- Real-time data display
- Action buttons with icons
- Status badges (color-coded)
- Responsive tables with horizontal scroll
- Modal dialogs for create operations
- Toast notifications for actions

---

### 3. Tenant Admin Dashboard
**Purpose**: Tenant-specific management and configuration

**Visual Identity**:
- Primary color: Blue
- Icon: Building2
- Title: "Tenant Admin Dashboard"

**Tabs**:
1. **Overview Tab**:
   - 3 stat cards in grid:
     - Total Users (tenant users count)
     - Connected Devices (with online count)
     - OAuth Status (Connected/Not Connected)

2. **Users Tab**:
   - "Add User" button with Plus icon
   - Data table with columns:
     - User (email)
     - Status (badge: active/inactive)
     - Joined (date)
     - Actions (View button)
   - Modal form for creating user:
     - Email (required)
     - Password (required)

3. **OAuth Config Tab**:
   - eWeLink Integration card
   - Connection status display
   - Connect/Reconnect button
   - Visual feedback for connection state

4. **MCP Tab**:
   - MCP URL card
   - Copy MCP URL button with Copy icon
   - Test Endpoint button with ExternalLink icon
   - Usage instructions

**Features**:
- User creation workflow
- OAuth connection management
- MCP endpoint configuration
- Copy to clipboard functionality

---

### 4. Tenant User Dashboard
**Purpose**: Personal device control and MCP access

**Visual Identity**:
- Primary color: Green
- Icon: Home
- Title: "My Dashboard"

**Tabs**:
1. **My Devices Tab**:
   - Device cards in grid (3 columns on desktop):
     - Device name
     - Device type
     - Online/Offline badge
     - Current state (On/Off)
     - Toggle button (Turn On/Off)
     - Brightness level (if applicable)
   - Empty state:
     - Home icon
     - "No devices found" message
     - "Connect your eWeLink account to see your devices"
     - Connect eWeLink Account button

2. **eWeLink Tab**:
   - Connection status card
   - Connection Status display
   - Connect Account / Reconnect button
   - Visual connection indicator

3. **MCP Access Tab**:
   - MCP Access card
   - "Your personal MCP endpoint for AI integration" description
   - Copy My MCP URL button with Copy icon
   - Test Connection button with ExternalLink icon
   - Help text: "Use this URL to connect AI assistants to your eWeLink devices"

**Features**:
- Real-time device control
- Device status indicators
- OAuth connection flow
- MCP endpoint access
- Responsive device grid

---

## Common Components

### Navigation Bar (All Dashboards)
- White background with shadow
- Left side: Role icon + Dashboard title
- Right side: "Welcome, [user]" + Logout button
- Responsive with proper spacing
- Max width: 7xl (1280px)

### Tab Navigation
- Full-width tab list
- Active tab indicator (underline)
- Smooth transitions
- Keyboard accessible

### Stat Cards
- White background with shadow
- Rounded corners
- Icon in top right
- Title (small, gray)
- Large value number
- Description text (small, gray)
- Hover effect

### Data Tables
- Full width with horizontal scroll on mobile
- Gray header background
- White rows
- Hover effect on rows
- Action buttons aligned right
- Responsive column hiding

### Status Badges
- Rounded pill shape
- Small text (xs)
- Color variants:
  - Active/Approved: Green background
  - Pending: Red background
  - Offline: Gray background
  - Online: Green background

### Modal Dialogs
- Overlay with backdrop
- Centered card
- Header with title and description
- Form content
- Footer with buttons
- Close button
- Keyboard accessible (ESC to close)

### Alert Messages
- Full width banner
- Rounded corners
- Border and background matching severity
- Success: Green
- Error: Red
- Icon optional
- Dismissible

### Buttons
- Variants:
  - Default: Primary color background
  - Outline: Border with transparent background
  - Destructive: Red background
  - Ghost: No background
- Sizes: sm, default, lg
- Icon support (left or right)
- Loading state with spinner
- Disabled state

---

## Functional Requirements

### Authentication
- JWT token stored in localStorage
- Auto-login on mount if token exists
- Axios interceptor for auth headers
- Role-based routing
- Logout clears token and user data

### API Integration
- Base URL: `/api` (Vite proxy)
- Endpoints:
  - `POST /api/global-admin/login`
  - `POST /api/tenant-admin/login`
  - `POST /api/auth/login`
  - `GET /api/global-admin/tenants`
  - `GET /api/global-admin/stats`
  - `GET /api/tenant-admin/users`
  - `GET /api/tenant/devices`
  - `GET /api/oauth/status`
  - `POST /api/tenant/devices/:id/control`

### State Management
- React hooks (useState, useEffect)
- Local component state
- Props drilling for shared state
- No external state management library needed

### Error Handling
- Try-catch blocks for all async operations
- User-friendly error messages
- Console logging for debugging
- Fallback UI for failed data loads
- Network error handling

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Grid layouts adapt to screen size
- Horizontal scrolling for tables
- Touch-friendly button sizes
- Proper spacing on all devices

### Accessibility
- Semantic HTML elements
- Proper ARIA labels
- Keyboard navigation
- Focus states on interactive elements
- Sufficient color contrast (WCAG AA)
- Screen reader friendly

---

## Design Principles

1. **Professional Aesthetics**: Modern, clean design with proper visual hierarchy
2. **Role-Based Branding**: Distinct visual identity for each user type
3. **Responsive Layout**: Mobile-friendly design with proper breakpoints
4. **Accessibility**: Proper contrast, focus states, and semantic HTML
5. **User Experience**: Intuitive navigation and clear call-to-actions
6. **Consistency**: Use shadcn/ui components throughout
7. **Performance**: Optimize re-renders and API calls
8. **Error Resilience**: Graceful error handling and fallback states

---

## Implementation Notes

- All components should be React functional components with hooks
- Use Tailwind CSS utility classes for styling
- Import shadcn/ui components from `./components/ui/`
- Icons from `lucide-react`
- Axios for API calls with interceptors
- Environment variables via Vite (`import.meta.env.VITE_*`)
- PropTypes or TypeScript interfaces for component props (optional)

---

## Success Criteria

✅ Modern, professional UI design
✅ Role-based dashboards with distinct visual identities
✅ Fully responsive on all device sizes
✅ Accessible to all users (WCAG AA)
✅ Smooth transitions and interactions
✅ Clear user feedback for all actions
✅ Consistent use of design system
✅ Production-ready code quality

