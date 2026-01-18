import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@company.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Resetting admin user (${email})...`);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'Admin',
                status: 'Active',
                tokenVersion: { increment: 1 } // Invalidate old tokens
            },
            create: {
                name: 'Admin User',
                email,
                password: hashedPassword,
                role: 'Admin',
                branch: 'Main Branch',
                status: 'Active',
                permissions: JSON.stringify({
                    Inventory: ['read', 'write', 'delete'],
                    Tasks: ['read', 'write', 'delete'],
                    Employees: ['read', 'write', 'delete'],
                    Reports: ['read', 'write', 'delete'],
                    Branches: ['read', 'write', 'delete'],
                    Settings: ['read', 'write']
                })
            }
        });

        console.log('Admin user reset successfully.');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (error) {
        console.error("Error resetting admin:", error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
