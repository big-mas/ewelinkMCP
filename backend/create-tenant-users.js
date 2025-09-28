const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTenantUsers() {
    try {
        // Get existing tenants
        const demoTenant = await prisma.tenant.findFirst({
            where: { domain: 'demo.company.com' }
        });
        
        const acmeTenant = await prisma.tenant.findFirst({
            where: { domain: 'acme.corp.com' }
        });

        if (!demoTenant || !acmeTenant) {
            console.log('Tenants not found. Please create tenants first.');
            return;
        }

        // Create tenant users for Demo Company
        const demoUser1 = await prisma.tenantUser.upsert({
            where: { 
                email_tenantId: {
                    email: 'user@demo.company.com',
                    tenantId: demoTenant.id
                }
            },
            update: {},
            create: {
                email: 'user@demo.company.com',
                name: 'Demo User',
                status: 'ACTIVE',
                tenantId: demoTenant.id,
                ewelinkUserId: 'demo_user_001',
                ewelinkAccessToken: null,
                ewelinkRefreshToken: null
            }
        });

        const demoUser2 = await prisma.tenantUser.upsert({
            where: { 
                email_tenantId: {
                    email: 'john@demo.company.com',
                    tenantId: demoTenant.id
                }
            },
            update: {},
            create: {
                email: 'john@demo.company.com',
                name: 'John Smith',
                status: 'ACTIVE',
                tenantId: demoTenant.id,
                ewelinkUserId: 'demo_user_002',
                ewelinkAccessToken: null,
                ewelinkRefreshToken: null
            }
        });

        // Create tenant users for Acme Corporation
        const acmeUser1 = await prisma.tenantUser.upsert({
            where: { 
                email_tenantId: {
                    email: 'user@acme.corp.com',
                    tenantId: acmeTenant.id
                }
            },
            update: {},
            create: {
                email: 'user@acme.corp.com',
                name: 'Acme User',
                status: 'ACTIVE',
                tenantId: acmeTenant.id,
                ewelinkUserId: 'acme_user_001',
                ewelinkAccessToken: null,
                ewelinkRefreshToken: null
            }
        });

        const acmeUser2 = await prisma.tenantUser.upsert({
            where: { 
                email_tenantId: {
                    email: 'jane@acme.corp.com',
                    tenantId: acmeTenant.id
                }
            },
            update: {},
            create: {
                email: 'jane@acme.corp.com',
                name: 'Jane Doe',
                status: 'ACTIVE',
                tenantId: acmeTenant.id,
                ewelinkUserId: 'acme_user_002',
                ewelinkAccessToken: null,
                ewelinkRefreshToken: null
            }
        });

        console.log('✅ Tenant users created successfully:');
        console.log('Demo Company Users:');
        console.log('- user@demo.company.com (Demo User)');
        console.log('- john@demo.company.com (John Smith)');
        console.log('Acme Corporation Users:');
        console.log('- user@acme.corp.com (Acme User)');
        console.log('- jane@acme.corp.com (Jane Doe)');
        
        // Create audit logs
        await prisma.auditLog.createMany({
            data: [
                {
                    action: 'CREATE_TENANT_USER',
                    details: 'Created tenant user: Demo User',
                    tenantUserId: demoUser1.id
                },
                {
                    action: 'CREATE_TENANT_USER',
                    details: 'Created tenant user: John Smith',
                    tenantUserId: demoUser2.id
                },
                {
                    action: 'CREATE_TENANT_USER',
                    details: 'Created tenant user: Acme User',
                    tenantUserId: acmeUser1.id
                },
                {
                    action: 'CREATE_TENANT_USER',
                    details: 'Created tenant user: Jane Doe',
                    tenantUserId: acmeUser2.id
                }
            ]
        });

    } catch (error) {
        console.error('Error creating tenant users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTenantUsers();
