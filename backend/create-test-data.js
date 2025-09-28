const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create a tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Company',
        domain: 'demo.company.com',
        status: 'active',
        ewelinkClientId: 'demo_client_id',
        ewelinkClientSecret: 'demo_client_secret',
        ewelinkRedirectUri: 'https://demo.company.com/oauth/callback'
      }
    });
    
    console.log('✅ Tenant created:', tenant.name);
    
    // Create a tenant admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const tenantAdmin = await prisma.tenantAdmin.create({
      data: {
        email: 'admin@demo.company.com',
        password: hashedPassword,
        name: 'Demo Admin',
        tenantId: tenant.id
      }
    });
    
    console.log('✅ Tenant Admin created:', tenantAdmin.email);
    
    // Create a tenant user (no password field)
    const tenantUser = await prisma.tenantUser.create({
      data: {
        email: 'user@demo.company.com',
        name: 'Demo User',
        tenantId: tenant.id
      }
    });
    
    console.log('✅ Tenant User created:', tenantUser.email);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
