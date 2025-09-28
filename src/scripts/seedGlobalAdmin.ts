import { PrismaClient } from '@prisma/client';
import { GlobalAdminService } from '../services/globalAdminService';
import { generateEncryptionKey } from '../utils/encryption';

const prisma = new PrismaClient();

async function seedGlobalAdmin() {
  try {
    console.log('🌱 Seeding Global Admin...');

    // Check if any global admin already exists
    const existingAdmin = await prisma.globalAdmin.findFirst();
    
    if (existingAdmin) {
      console.log('✅ Global Admin already exists:', existingAdmin.email);
      return;
    }

    // Default credentials (should be changed after first login)
    const defaultEmail = process.env.GLOBAL_ADMIN_EMAIL || 'admin@ewelinkMCP.local';
    const defaultPassword = process.env.GLOBAL_ADMIN_PASSWORD || 'admin123456';
    const defaultName = process.env.GLOBAL_ADMIN_NAME || 'System Administrator';

    // Create the first global admin
    const globalAdmin = await GlobalAdminService.createGlobalAdmin(
      defaultEmail,
      defaultPassword,
      defaultName
    );

    console.log('✅ Global Admin created successfully!');
    console.log('📧 Email:', globalAdmin.email);
    console.log('🔑 Password:', defaultPassword);
    console.log('⚠️  Please change the password after first login!');

    // Generate encryption key if not set
    if (!process.env.ENCRYPTION_KEY) {
      const encryptionKey = generateEncryptionKey();
      console.log('\n🔐 Generated Encryption Key (add to .env):');
      console.log(`ENCRYPTION_KEY=${encryptionKey}`);
      console.log('⚠️  Save this key securely - it\'s needed to decrypt OAuth secrets!');
    }

  } catch (error) {
    console.error('❌ Error seeding Global Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedGlobalAdmin();
}

export { seedGlobalAdmin };
