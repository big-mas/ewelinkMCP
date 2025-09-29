import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/encryption';

const prisma = new PrismaClient();

async function createCompleteDemoData() {
  try {
    console.log('🚀 Creating comprehensive demo data...\n');

    // 1. Create Global Admin
    console.log('📋 Step 1: Creating Global Admin...');
    let globalAdmin = await prisma.globalAdmin.findUnique({
      where: { email: 'admin@ewelinkMCP.local' }
    });

    if (!globalAdmin) {
      const hashedPassword = await hashPassword('admin123');
      globalAdmin = await prisma.globalAdmin.create({
        data: {
          email: 'admin@ewelinkMCP.local',
          password: hashedPassword,
          name: 'System Administrator'
        }
      });
      console.log('✅ Global Admin created: admin@ewelinkMCP.local');
    } else {
      console.log('✅ Global Admin already exists: admin@ewelinkMCP.local');
    }

    // 2. Create Demo Company Tenant (APPROVED)
    console.log('\n📋 Step 2: Creating Demo Company Tenant...');
    let demoTenant = await prisma.tenant.findUnique({
      where: { domain: 'demo.company.com' }
    });

    if (!demoTenant) {
      demoTenant = await prisma.tenant.create({
        data: {
          name: 'Demo Company',
          domain: 'demo.company.com',
          status: 'APPROVED', // Set to APPROVED for immediate use
          approvedAt: new Date(),
          approvedBy: globalAdmin.id,
          ewelinkClientId: 'demo_client_id_123',
          ewelinkClientSecret: 'demo_client_secret_456',
          ewelinkRedirectUri: 'https://3000-ihzbw8oixt6l3ewk6lu86-be9e2a56.manusvm.computer/oauth/callback/demo'
        }
      });
      console.log('✅ Demo Company tenant created (APPROVED): demo.company.com');
    } else {
      // Update to approved if not already
      if (demoTenant.status !== 'APPROVED') {
        demoTenant = await prisma.tenant.update({
          where: { id: demoTenant.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: globalAdmin.id
          }
        });
        console.log('✅ Demo Company tenant updated to APPROVED');
      } else {
        console.log('✅ Demo Company tenant already exists and approved');
      }
    }

    // 3. Create Acme Corporation Tenant (APPROVED)
    console.log('\n📋 Step 3: Creating Acme Corporation Tenant...');
    let acmeTenant = await prisma.tenant.findUnique({
      where: { domain: 'acme.corp.com' }
    });

    if (!acmeTenant) {
      acmeTenant = await prisma.tenant.create({
        data: {
          name: 'Acme Corporation',
          domain: 'acme.corp.com',
          status: 'APPROVED', // Set to APPROVED for immediate use
          approvedAt: new Date(),
          approvedBy: globalAdmin.id,
          ewelinkClientId: 'acme_client_id_789',
          ewelinkClientSecret: 'acme_client_secret_012',
          ewelinkRedirectUri: 'https://3000-ihzbw8oixt6l3ewk6lu86-be9e2a56.manusvm.computer/oauth/callback/acme'
        }
      });
      console.log('✅ Acme Corporation tenant created (APPROVED): acme.corp.com');
    } else {
      // Update to approved if not already
      if (acmeTenant.status !== 'APPROVED') {
        acmeTenant = await prisma.tenant.update({
          where: { id: acmeTenant.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: globalAdmin.id
          }
        });
        console.log('✅ Acme Corporation tenant updated to APPROVED');
      } else {
        console.log('✅ Acme Corporation tenant already exists and approved');
      }
    }

    // 4. Create Tenant Admins (ACTIVE status)
    console.log('\n📋 Step 4: Creating Tenant Admins...');
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

    for (const adminData of tenantAdmins) {
      let admin = await prisma.tenantAdmin.findFirst({
        where: { 
          email: adminData.email,
          tenantId: adminData.tenantId
        }
      });

      if (!admin) {
        const hashedPassword = await hashPassword(adminData.password);
        admin = await prisma.tenantAdmin.create({
          data: {
            email: adminData.email,
            password: hashedPassword,
            name: adminData.name,
            tenantId: adminData.tenantId,
            status: 'ACTIVE' // Set to ACTIVE for immediate use
          }
        });
        console.log(`✅ Tenant Admin created (ACTIVE): ${adminData.email}`);
      } else {
        // Update to active if not already
        if (admin.status !== 'ACTIVE') {
          admin = await prisma.tenantAdmin.update({
            where: { id: admin.id },
            data: { status: 'ACTIVE' }
          });
          console.log(`✅ Tenant Admin updated to ACTIVE: ${adminData.email}`);
        } else {
          console.log(`✅ Tenant Admin already exists and active: ${adminData.email}`);
        }
      }
    }

    // 5. Create Tenant Users
    console.log('\n📋 Step 5: Creating Tenant Users...');
    const tenantUsers = [
      {
        email: 'user@demo.company.com',
        name: 'Demo User',
        password: 'user123',
        tenantId: demoTenant.id
      },
      {
        email: 'john@demo.company.com',
        name: 'John Smith',
        password: 'john123',
        tenantId: demoTenant.id
      },
      {
        email: 'user@acme.corp.com',
        name: 'Acme User',
        password: 'user123',
        tenantId: acmeTenant.id
      },
      {
        email: 'jane@acme.corp.com',
        name: 'Jane Doe',
        password: 'jane123',
        tenantId: acmeTenant.id
      }
    ];

    for (const userData of tenantUsers) {
      let user = await prisma.tenantUser.findFirst({
        where: { 
          email: userData.email,
          tenantId: userData.tenantId
        }
      });

      if (!user) {
        const hashedPassword = await hashPassword(userData.password);
        user = await prisma.tenantUser.create({
          data: {
            email: userData.email,
            name: userData.name,
            password: hashedPassword,
            tenantId: userData.tenantId,
            status: 'ACTIVE' // Set to ACTIVE for immediate use
          }
        });
        console.log(`✅ Tenant User created (ACTIVE): ${userData.email}`);
      } else {
        // Update to active if not already
        if (user.status !== 'ACTIVE') {
          user = await prisma.tenantUser.update({
            where: { id: user.id },
            data: { status: 'ACTIVE' }
          });
          console.log(`✅ Tenant User updated to ACTIVE: ${userData.email}`);
        } else {
          console.log(`✅ Tenant User already exists and active: ${userData.email}`);
        }
      }
    }

    // 6. Create audit logs for the setup
    console.log('\n📋 Step 6: Creating audit logs...');
    await prisma.auditLog.create({
      data: {
        globalAdminId: globalAdmin.id,
        action: 'DEMO_DATA_SETUP',
        resource: 'system',
        details: JSON.stringify({
          tenantsCreated: 2,
          adminsCreated: 2,
          usersCreated: 4,
          timestamp: new Date().toISOString()
        })
      }
    });
    console.log('✅ Audit log created for demo data setup');

    // 7. Verify data creation
    console.log('\n📋 Step 7: Verifying data creation...');
    const counts = {
      globalAdmins: await prisma.globalAdmin.count(),
      tenants: await prisma.tenant.count(),
      tenantAdmins: await prisma.tenantAdmin.count(),
      tenantUsers: await prisma.tenantUser.count(),
      auditLogs: await prisma.auditLog.count()
    };

    console.log('\n🎉 DEMO DATA CREATION COMPLETED!\n');
    console.log('📊 DATABASE SUMMARY:');
    console.log('==================');
    console.log(`Global Admins: ${counts.globalAdmins}`);
    console.log(`Tenants: ${counts.tenants}`);
    console.log(`Tenant Admins: ${counts.tenantAdmins}`);
    console.log(`Tenant Users: ${counts.tenantUsers}`);
    console.log(`Audit Logs: ${counts.auditLogs}\n`);

    console.log('🔐 DEMO ACCOUNT CREDENTIALS:');
    console.log('============================\n');
    
    console.log('🔧 GLOBAL ADMIN:');
    console.log('  Email: admin@ewelinkMCP.local');
    console.log('  Password: admin123\n');
    
    console.log('👔 TENANT ADMINS:');
    console.log('  Demo Company Admin:');
    console.log('    Email: admin@demo.company.com');
    console.log('    Password: demo123');
    console.log('    Callback URL: https://3000-ihzbw8oixt6l3ewk6lu86-be9e2a56.manusvm.computer/oauth/callback/demo\n');
    
    console.log('  Acme Corporation Admin:');
    console.log('    Email: admin@acme.corp.com');
    console.log('    Password: acme123');
    console.log('    Callback URL: https://3000-ihzbw8oixt6l3ewk6lu86-be9e2a56.manusvm.computer/oauth/callback/acme\n');
    
    console.log('👤 TENANT USERS:');
    console.log('  Demo Company Users:');
    console.log('    Email: user@demo.company.com');
    console.log('    Password: user123');
    console.log('    Email: john@demo.company.com');
    console.log('    Password: john123\n');
    console.log('  Acme Corporation Users:');
    console.log('    Email: user@acme.corp.com');
    console.log('    Password: user123');
    console.log('    Email: jane@acme.corp.com');
    console.log('    Password: jane123\n');
    
    console.log('✅ All accounts are ACTIVE and ready for use!');

  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCompleteDemoData()
  .then(() => {
    console.log('\n🎯 Demo data creation script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Demo data creation script failed:', error);
    process.exit(1);
  });
