# eWeLink MCP Frontend - Enhanced UI

## 🎨 Overview

This is the **enhanced, modern frontend** for the eWeLink MCP Server, built with React 18, Vite, Tailwind CSS, and shadcn/ui components. It provides three role-based dashboards with professional, accessible, and responsive interfaces.

## 🚀 Features

### Modern Technology Stack
- **React 18** - Latest React with hooks
- **Vite** - Lightning-fast development and build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components
- **Lucide React** - Beautiful, consistent icons
- **Axios** - Promise-based HTTP client

### Three Role-Based Dashboards

#### 1. **Global Admin Dashboard** (Indigo Theme)
- System-wide metrics and monitoring
- Tenant management (approve, suspend, create)
- Cross-tenant user oversight
- System health status
- Recent activity tracking

#### 2. **Tenant Admin Dashboard** (Blue Theme)
- Organization metrics
- User management within tenant
- OAuth configuration for eWeLink
- MCP endpoint management
- Device overview

#### 3. **Tenant User Dashboard** (Green Theme)
- Personal device dashboard
- Real-time device control
- eWeLink account connection
- Personal MCP endpoint access
- AI assistant integration guide

### Design Highlights

✨ **Professional Aesthetics**
- Modern gradient backgrounds
- Shadow and depth effects
- Smooth animations and transitions
- Consistent spacing and typography

🎯 **User Experience**
- Intuitive navigation with tabbed interfaces
- Clear visual hierarchy
- Real-time feedback for actions
- Loading states and error handling

♿ **Accessibility**
- WCAG AA compliant color contrast
- Semantic HTML elements
- Keyboard navigation support
- Screen reader friendly
- Focus states on interactive elements

📱 **Responsive Design**
- Mobile-first approach
- Breakpoints for all screen sizes
- Touch-friendly buttons and controls
- Horizontal scrolling for tables

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx          # Enhanced login interface
│   │   ├── dashboards/
│   │   │   ├── GlobalAdminDashboard.jsx # Global admin interface
│   │   │   ├── TenantAdminDashboard.jsx # Tenant admin interface
│   │   │   └── TenantUserDashboard.jsx  # User interface
│   │   └── ui/
│   │       ├── button.jsx               # shadcn/ui Button
│   │       ├── card.jsx                 # shadcn/ui Card
│   │       ├── tabs.jsx                 # shadcn/ui Tabs
│   │       └── dialog.jsx               # shadcn/ui Dialog
│   ├── lib/
│   │   └── utils.js                     # Utility functions
│   ├── App.jsx                          # Main application component
│   ├── App.css                          # Custom animations and styles
│   ├── index.css                        # Tailwind and CSS variables
│   └── main.jsx                         # Application entry point
├── index.html                           # HTML template
├── vite.config.js                       # Vite configuration
├── tailwind.config.js                   # Tailwind configuration
├── postcss.config.js                    # PostCSS configuration
└── package.json                         # Dependencies and scripts
```

## 🛠️ Development

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎨 Component Library

### shadcn/ui Components

All UI components are built on top of shadcn/ui for consistency and accessibility:

- **Button** - Multiple variants (default, outline, destructive, ghost, link)
- **Card** - Content containers with headers, titles, and descriptions
- **Tabs** - Tabbed navigation interface
- **Dialog** - Modal dialogs for forms and confirmations

### Color System

#### Role-Based Colors
- **Global Admin**: Indigo (`indigo-600`)
- **Tenant Admin**: Blue (`blue-600`)
- **Tenant User**: Green (`green-600`)

#### Status Colors
- **Success**: Green (`green-50`, `green-600`, `green-800`)
- **Error**: Red (`red-50`, `red-600`, `red-800`)
- **Warning**: Yellow/Orange (`orange-100`, `orange-800`)
- **Info**: Blue (`blue-50`, `blue-600`)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000/api
```

### API Proxy

Vite is configured to proxy API requests to the backend:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

## 🎯 Features by Dashboard

### Global Admin

**Overview Tab**
- Total tenants count
- Pending approvals count
- Total users count
- System status indicator
- Recent activity feed

**Tenants Tab**
- Tenant list with status
- Create new tenant form
- Approve/suspend actions
- Tenant details (name, domain, users)

**Users Tab**
- Cross-tenant user management
- (Coming soon)

**Settings Tab**
- System configuration
- (Coming soon)

### Tenant Admin

**Overview Tab**
- Total users count
- Connected devices count
- OAuth connection status
- Welcome message

**Users Tab**
- User list with status
- Add new user form
- User details

**OAuth Config Tab**
- eWeLink connection status
- Connect/reconnect button
- Connection instructions

**MCP Tab**
- MCP endpoint URL
- Copy URL button
- Test endpoint button
- Integration instructions

### Tenant User

**My Devices Tab**
- Device cards grid
- Device control (on/off)
- Online/offline status
- Brightness control (where applicable)
- Empty state with connect button

**eWeLink Tab**
- Connection status
- Connect account button
- Feature list
- Benefits overview

**MCP Access Tab**
- Personal MCP endpoint
- Copy URL button
- Test connection button
- Step-by-step integration guide

## 🔒 Security

- JWT token stored in localStorage
- Automatic token refresh
- Axios interceptors for auth headers
- Role-based access control
- Secure API communication

## 📊 State Management

- React hooks (useState, useEffect)
- Local component state
- Props drilling for shared state
- No external state management library needed

## 🚀 Performance

- Vite for fast HMR (Hot Module Replacement)
- Code splitting by route
- Optimized production builds
- Minimal bundle size
- Lazy loading for components

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with different user types
- [ ] Navigation between tabs
- [ ] Form submissions
- [ ] Device control
- [ ] OAuth connection flow
- [ ] MCP URL copying
- [ ] Responsive design on mobile
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

## 📝 Development Guidelines

### Code Style
- Use functional components with hooks
- Use Tailwind utility classes for styling
- Import shadcn/ui components from `./components/ui/`
- Use Lucide React icons
- Follow React best practices

### Component Structure
```jsx
import React from 'react';
import { Icon } from 'lucide-react';
import { Button } from './components/ui/button';

export function MyComponent({ prop1, prop2 }) {
  const [state, setState] = React.useState(initialValue);

  const handleAction = () => {
    // Handle action
  };

  return (
    <div className="container">
      {/* Component JSX */}
    </div>
  );
}

export default MyComponent;
```

## 🎨 Design Tokens

### Spacing
- Uses Tailwind's default spacing scale
- Consistent padding: `p-4`, `p-6`
- Consistent gaps: `gap-4`, `gap-6`

### Typography
- Font family: System font stack
- Font weights: 400, 500, 600, 700, 800
- Text sizes: xs, sm, base, lg, xl, 2xl, 3xl

### Shadows
- Card shadows: `shadow-lg`, `shadow-xl`
- Hover effects: `hover:shadow-xl`

## 🤝 Contributing

1. Create a new branch for your feature
2. Follow the code style guidelines
3. Test thoroughly on all dashboards
4. Ensure responsive design works
5. Check accessibility compliance
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the excellent component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first framework
- [Lucide](https://lucide.dev/) for the beautiful icons
- [React](https://react.dev/) for the amazing framework
- [Vite](https://vitejs.dev/) for the blazing fast build tool

---

**Built with ❤️ for the smart home community**

