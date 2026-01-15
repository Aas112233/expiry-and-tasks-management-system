import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@company.com';
    const password = 'password';

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} already exists.`);
        // Optional: Update password if needed
        // const hashedPassword = await bcrypt.hash(password, 10);
        // await prisma.user.update({
        //     where: { email },
        //     data: { password: hashedPassword }
        // });
    } else {
        console.log(`Creating user ${email}...`);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await prisma.user.create({
            data: {
                name: 'Admin User',
                email,
                password: hashedPassword,
                role: 'Admin',
                branch: 'Main Branch',
                permissions: JSON.stringify({ all: true }) // Grant all permissions
            }
        });
        console.log('Admin user created successfully.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
