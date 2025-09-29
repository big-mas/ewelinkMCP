import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/encryption';

const prisma = new PrismaClient();

async function migrateExistingData() {
  try {
    console.log('🔄 Starting data migration...');

    // Get all existing users
    const existingUsers = await prisma.user.findMany({
      where: {
        migrationCompleted: false
      }
    });

    if (existingUsers.length === 0) {
      console.log('✅ No users to migrate or migration already completed');
      return;
    }

    console.log(`📊 Found ${existingUsers.length} users to migrate`);

    // Create a default tenant for existing users
    let defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });

    if (!defaultTenant) {
      console.log('🏢 Creating default tenant for existing users...');
      defaultTenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          domain: 'default.local',
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });
      console.log('✅ Default tenant created:', defaultTenant.id);
    }

    let migratedCount = 0;
    let adminCount = 0;
    let userCount = 0;

    for (const user of existingUsers) {
      try {
        console.log(`👤 Migrating user: ${user.email}`);

        // Determine if user should be tenant admin or regular user
        const isAdmin = user.role === 'admin';

        if (isAdmin) {
          // Create as Tenant Admin
          const tenantAdmin = await prisma.tenantAdmin.create({
            data: {
              email: user.email,
              password: user.password, // Already hashed
              name: user.email.split('@')[0], // Use email prefix as name
              tenantId: defaultTenant.id,
              status: 'ACTIVE',
              ewelinkAccessToken: user.ewelinkAccessToken,
              ewelinkRefreshToken: user.ewelinkRefreshToken,
              ewelinkUserId: user.ewelinkUserId,
              createdAt: user.createdAt
            }
          });

          // Migrate audit logs
          await prisma.auditLog.updateMany({
            where: { legacyUserId: user.id },
            data: { tenantAdminId: tenantAdmin.id }
          });

          adminCount++;
          console.log(`  ✅ Migrated as Tenant Admin: ${tenantAdmin.id}`);
        } else {
          // Create as Tenant User
          const hashedPassword = await hashPassword('user123'); // Default password
          const tenantUser = await prisma.tenantUser.create({
            data: {
              email: user.email,
              name: user.email.split('@')[0], // Use email prefix as name
              password: hashedPassword,
              tenantId: defaultTenant.id,
              status: 'ACTIVE',
              ewelinkAccessToken: user.ewelinkAccessToken,
              ewelinkRefreshToken: user.ewelinkRefreshToken,
              ewelinkUserId: user.ewelinkUserId,
              createdAt: user.createdAt
            }
          });

          // Migrate audit logs
          await prisma.auditLog.updateMany({
            where: { legacyUserId: user.id },
            data: { tenantUserId: tenantUser.id }
          });

          userCount++;
          console.log(`  ✅ Migrated as Tenant User: ${tenantUser.id}`);
        }

        // Mark user as migrated
        await prisma.user.update({
          where: { id: user.id },
          data: {
            migrationCompleted: true
          }
        });

        migratedCount++;

      } catch (error) {
        console.error(`  ❌ Failed to migrate user ${user.email}:`, error);
      }
    }

    // Migrate devices to default tenant (if any exist without tenantId)
    try {
      const devicesWithoutTenant = await prisma.device.findMany();

      if (devicesWithoutTenant.length > 0) {
        console.log(`🔧 Migrating ${devicesWithoutTenant.length} devices to default tenant...`);
        
        // Update all devices to belong to default tenant
        await prisma.device.updateMany({
          data: {
            tenantId: defaultTenant.id
          }
        });

        console.log('✅ Devices migrated to default tenant');
      }
    } catch (error) {
      console.log('ℹ️  No existing devices to migrate');
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  👥 Total users migrated: ${migratedCount}`);
    console.log(`  👑 Tenant Admins: ${adminCount}`);
    console.log(`  👤 Tenant Users: ${userCount}`);
    console.log(`  🏢 Default Tenant ID: ${defaultTenant.id}`);
    console.log('✅ Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Error during data migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateExistingData();
}

export { migrateExistingData };
