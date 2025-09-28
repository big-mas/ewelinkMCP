const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Delete existing admin
    await prisma.globalAdmin.deleteMany({});
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create new admin
    const admin = await prisma.globalAdmin.create({
      data: {
        email: 'admin@ewelinkMCP.local',
        password: hashedPassword,
        name: 'System Administrator'
      }
    });
    
    console.log('✅ Global Admin created:', admin.email);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
