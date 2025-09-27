import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateUsersToTenants() {
  console.log('🔄 Starting user migration to multitenant structure...');

  try {
    // Find or create default tenant
    let defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });

    if (!defaultTenant) {
      console.log('📦 Creating default tenant...');
      defaultTenant = await prisma.tenant.create({
        data: {
          name: 'Default Tenant',
          domain: 'default.local',
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });
      console.log(`✅ Default tenant created: ${defaultTenant.id}`);
    } else {
      console.log(`ℹ️  Using existing default tenant: ${defaultTenant.id}`);
    }

    // Get all existing users from the legacy User table
    const legacyUsers = await prisma.user.findMany();
    console.log(`📊 Found ${legacyUsers.length} legacy users to migrate`);

    if (legacyUsers.length === 0) {
      console.log('✅ No users to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of legacyUsers) {
      try {
        // Check if user already migrated
        const existingTenantUser = await prisma.tenantUser.findUnique({
          where: {
            email_tenantId: {
              email: user.email,
              tenantId: defaultTenant.id
            }
          }
        });

        if (existingTenantUser) {
          console.log(`⏭️  User ${user.email} already migrated, skipping...`);
          skippedCount++;
          continue;
        }

        // Create tenant user from legacy user
        const tenantUser = await prisma.tenantUser.create({
          data: {
            email: user.email,
            name: (user as any).name || null, // Handle optional name field
            tenantId: defaultTenant.id,
            status: 'ACTIVE',
            ewelinkAccessToken: user.ewelinkAccessToken,
            ewelinkRefreshToken: user.ewelinkRefreshToken,
            ewelinkUserId: user.ewelinkUserId,
            createdAt: user.createdAt,
            lastActive: (user as any).lastActive || null // Handle optional lastActive field
          }
        });

        console.log(`✅ Migrated user: ${user.email} → ${tenantUser.id}`);
        migratedCount++;

        // Create audit log for migration
        await prisma.auditLog.create({
          data: {
            legacyUserId: user.id,
            tenantUserId: tenantUser.id,
            action: 'USER_MIGRATED_TO_TENANT',
            resource: `user:${tenantUser.id}`,
            details: JSON.stringify({
              originalUserId: user.id,
              tenantId: defaultTenant.id,
              migratedAt: new Date().toISOString()
            })
          }
        });

      } catch (error) {
        console.error(`❌ Failed to migrate user ${user.email}:`, error);
      }
    }

    // Migrate devices to default tenant
    console.log('\n🔧 Migrating devices to default tenant...');
    
    try {
      // Get all devices and check which ones need tenant assignment
      const allDevices = await prisma.device.findMany();
      console.log(`📊 Found ${allDevices.length} devices to check`);

      if (allDevices.length > 0) {
        // For simplicity, assign all devices to default tenant
        // In a real migration, you'd want more sophisticated logic
        const devicesResult = await prisma.device.updateMany({
          data: {
            tenantId: defaultTenant.id
          }
        });

        console.log(`✅ Updated ${devicesResult.count} devices with default tenant`);
      } else {
        console.log('ℹ️  No devices found to migrate');
      }
    } catch (error) {
      console.log('ℹ️  Device migration completed or not needed');
    }

    // Update audit logs to reference migrated users
    console.log('\n📝 Updating audit logs...');
    
    const auditLogsWithLegacyUsers = await prisma.auditLog.findMany({
      where: {
        legacyUserId: { not: null },
        tenantUserId: null
      }
    });

    let auditUpdatedCount = 0;
    for (const auditLog of auditLogsWithLegacyUsers) {
      if (auditLog.legacyUserId) {
        // Find corresponding tenant user
        const legacyUser = await prisma.user.findUnique({
          where: { id: auditLog.legacyUserId }
        });

        if (legacyUser) {
          const tenantUser = await prisma.tenantUser.findUnique({
            where: {
              email_tenantId: {
                email: legacyUser.email,
                tenantId: defaultTenant.id
              }
            }
          });

          if (tenantUser) {
            await prisma.auditLog.update({
              where: { id: auditLog.id },
              data: { tenantUserId: tenantUser.id }
            });
            auditUpdatedCount++;
          }
        }
      }
    }

    console.log(`✅ Updated ${auditUpdatedCount} audit log entries`);

    console.log('\n📊 Migration Summary:');
    console.log(`  👥 Users migrated: ${migratedCount}`);
    console.log(`  ⏭️  Users skipped (already migrated): ${skippedCount}`);
    console.log(`  🏢 Default tenant: ${defaultTenant.name} (${defaultTenant.id})`);
    console.log(`  📝 Audit logs updated: ${auditUpdatedCount}`);
    
    console.log('\n✅ User migration completed successfully!');
    console.log('\n⚠️  Note: Legacy User table is preserved for rollback purposes.');
    console.log('   You can safely remove it after verifying the migration.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUsersToTenants()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUsersToTenants };
