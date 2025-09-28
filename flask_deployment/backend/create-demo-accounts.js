const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createDemoAccounts() {
  try {
    console.log('🚀 Creating demo accounts for all user roles...\n');

    // 1. Create Global Admin (if not exists)
    const existingGlobalAdmin = await prisma.globalAdmin.findUnique({
      where: { email: 'admin@ewelinkMCP.local' }
    });

    if (!existingGlobalAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await prisma.globalAdmin.create({
        data: {
          email: 'admin@ewelinkMCP.local',
          password: hashedPassword,
          name: 'System Administrator'
        }
      });
      console.log('✅ Global Admin created');
    } else {
      console.log('✅ Global Admin already exists');
    }

    // 2. Create Demo Company Tenant
    let demoTenant = await prisma.tenant.findUnique({
      where: { domain: 'demo.company.com' }
    });

    if (!demoTenant) {
      demoTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Company',
          domain: 'demo.company.com',
          status: 'active',
          approvedAt: new Date(),
          ewelinkClientId: 'demo_client_id_123',
          ewelinkClientSecret: 'demo_client_secret_456'
        }
      });
      console.log('✅ Demo Company tenant created');
    } else {
      console.log('✅ Demo Company tenant already exists');
    }

    // 3. Create Acme Corporation Tenant
    let acmeTenant = await prisma.tenant.findUnique({
      where: { domain: 'acme.corp.com' }
    });

    if (!acmeTenant) {
      acmeTenant = await prisma.tenant.create({
        data: {
          name: 'Acme Corporation',
          domain: 'acme.corp.com',
          status: 'active',
          approvedAt: new Date(),
          ewelinkClientId: 'acme_client_id_789',
          ewelinkClientSecret: 'acme_client_secret_012'
        }
      });
      console.log('✅ Acme Corporation tenant created');
    } else {
      console.log('✅ Acme Corporation tenant already exists');
    }

    // 4. Create Tenant Admins
    const tenantAdmins = [
      {
        email: 'admin@demo.company.com',
        password: 'demo123',
        name: 'Demo Admin',
        tenantId: demoTenant.id
      },
      {
        email: 'admin@acme.corp.com',
        password: 'acme123',
        name: 'Acme Admin',
        tenantId: acmeTenant.id
      }
    ];

    for (const admin of tenantAdmins) {
      const existing = await prisma.tenantAdmin.findUnique({
        where: { email: admin.email }
      });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        await prisma.tenantAdmin.create({
          data: {
            email: admin.email,
            password: hashedPassword,
            name: admin.name,
            tenantId: admin.tenantId
          }
        });
        console.log(`✅ Tenant Admin created: ${admin.email}`);
      } else {
        console.log(`✅ Tenant Admin already exists: ${admin.email}`);
      }
    }

    // 5. Create Tenant Users
    const tenantUsers = [
      {
        email: 'user@demo.company.com',
        name: 'Demo User',
        tenantId: demoTenant.id
      },
      {
        email: 'john@demo.company.com',
        name: 'John Smith',
        tenantId: demoTenant.id
      },
      {
        email: 'user@acme.corp.com',
        name: 'Acme User',
        tenantId: acmeTenant.id
      },
      {
        email: 'jane@acme.corp.com',
        name: 'Jane Doe',
        tenantId: acmeTenant.id
      }
    ];

    for (const user of tenantUsers) {
      const existing = await prisma.tenantUser.findUnique({
        where: { email: user.email }
      });

      if (!existing) {
        await prisma.tenantUser.create({
          data: {
            email: user.email,
            name: user.name,
            tenantId: user.tenantId
          }
        });
        console.log(`✅ Tenant User created: ${user.email}`);
      } else {
        console.log(`✅ Tenant User already exists: ${user.email}`);
      }
    }

    console.log('\n🎉 Demo accounts creation completed!\n');
    
    // Display summary
    console.log('📋 DEMO ACCOUNTS SUMMARY:');
    console.log('========================\n');
    
    console.log('🔧 GLOBAL ADMIN:');
    console.log('  Email: admin@ewelinkMCP.local');
    console.log('  Password: admin123');
    console.log('  Role: System Administrator\n');
    
    console.log('👔 TENANT ADMINS:');
    console.log('  Demo Company Admin:');
    console.log('    Email: admin@demo.company.com');
    console.log('    Password: demo123');
    console.log('    Tenant: Demo Company\n');
    
    console.log('  Acme Corporation Admin:');
    console.log('    Email: admin@acme.corp.com');
    console.log('    Password: acme123');
    console.log('    Tenant: Acme Corporation\n');
    
    console.log('👤 TENANT USERS:');
    console.log('  Demo Company Users:');
    console.log('    Email: user@demo.company.com (Demo User)');
    console.log('    Email: john@demo.company.com (John Smith)\n');
    
    console.log('  Acme Corporation Users:');
    console.log('    Email: user@acme.corp.com (Acme User)');
    console.log('    Email: jane@acme.corp.com (Jane Doe)\n');
    
    console.log('Note: Tenant Users use passwordless authentication via tenant admin invitation.');

  } catch (error) {
    console.error('❌ Error creating demo accounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoAccounts();
