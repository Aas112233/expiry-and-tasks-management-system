import prisma from './prisma';
import * as bcrypt from 'bcryptjs';

async function main() {
    console.log('--- Creating Super Admin User ---');

    try {
        const email = 'admin@company.com';
        const password = 'admin123';

        // 1. Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            console.log(`[Admin Seed] User ${email} already exists. Skipping.`);
            return;
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create Admin
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: email,
                password: hashedPassword,
                role: 'Admin',
                branch: 'Main Branch',
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff`,
                permissions: JSON.stringify({
                    "Inventory": "write",
                    "Tasks": "write",
                    "Employees": "write",
                    "Branches": "write",
                    "Analytics": "read",
                    "Settings": "write"
                })
            }
        });

        console.log(`[Admin Seed] SUCCESS: Created super admin user.`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('[Admin Seed] FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
