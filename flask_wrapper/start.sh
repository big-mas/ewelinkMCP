#!/bin/bash

# eWeLink MCP Server Startup Script
echo "🚀 Starting eWeLink MCP Server..."

# Set environment variables
export PORT=3001
export NODE_ENV=production
export FRONTEND_URL=https://ewelinkMCP.com

# Navigate to backend directory and ensure dependencies are installed
cd /home/ubuntu/ewelinkMCP/backend
echo "📦 Installing Node.js dependencies..."
npm install --production

# Build the application
echo "🔨 Building application..."
npm run build

# Ensure database is ready
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push

# Create admin user if not exists
echo "👤 Setting up admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();
  
  try {
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    
    await prisma.user.upsert({
      where: { email: 'admin@ewelinkMCP.local' },
      update: {},
      create: {
        email: 'admin@ewelinkMCP.local',
        password: hashedPassword,
        role: 'admin'
      }
    });
    
    console.log('✅ Admin user ready');
  } catch (error) {
    console.error('❌ Error with admin user:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createAdmin();
"

echo "✅ eWeLink MCP Server setup complete!"
echo "🌐 Starting Flask wrapper..."

# Start the Flask wrapper
cd /home/ubuntu/ewelinkMCP/flask_wrapper
python3 app.py
