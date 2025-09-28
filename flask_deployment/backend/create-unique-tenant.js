const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Create a tenant with unique domain
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Acme Corporation',
        domain: 'acme.corp.com',
        status: 'active',
        ewelinkClientId: 'acme_client_id',
        ewelinkClientSecret: 'acme_client_secret',
        ewelinkRedirectUri: 'https://acme.corp.com/oauth/callback'
      }
    });
    
    console.log('✅ Tenant created:', tenant.name);
    
    // Create a tenant admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const tenantAdmin = await prisma.tenantAdmin.create({
      data: {
        email: 'admin@acme.corp.com',
        password: hashedPassword,
        name: 'Acme Admin',
        tenantId: tenant.id
      }
    });
    
    console.log('✅ Tenant Admin created:', tenantAdmin.email);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
