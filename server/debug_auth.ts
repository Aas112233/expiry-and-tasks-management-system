import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env same way as index.ts
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function main() {
    console.log("--- Debugging Auth ---");
    console.log("JWT_SECRET from env:", process.env.JWT_SECRET);

    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`User: ${user.email}, ID: ${user.id}, TokenVersion: ${user.tokenVersion}`);
    }

    if (users.length === 0) {
        console.log("No users found! creating one...");
        return;
    }

    const admin = users.find(u => u.email === 'admin@company.com') || users[0];
    const password = 'password123'; // Assuming default

    console.log(`\nAttempting login for ${admin.email}...`);

    // Simulate Login
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log(`Password match for '${password}': ${isMatch}`);

    if (!isMatch) {
        console.log("Skipping token generation due to password mismatch (expected if password changed)");
    } else {
        const token = jwt.sign(
            {
                id: admin.id,
                role: admin.role,
                branch: admin.branch,
                tokenVersion: admin.tokenVersion
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );
        console.log("\nGenerated Token:", token);

        // Simulate Verify
        console.log("\nVerifying Token...");
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
            console.log("Decoded:", decoded);

            const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!dbUser) {
                console.error("User not found in DB during verify");
            } else {
                console.log(`DB TokenVersion: ${dbUser.tokenVersion}, Claim Version: ${decoded.tokenVersion}`);
                if ((decoded.tokenVersion || 0) !== (dbUser.tokenVersion || 0)) {
                    console.error("VERSION MISMATCH! This would cause 401.");
                } else {
                    console.log("Version check PASSED.");
                }
            }

        } catch (e) {
            console.error("Verification Failed:", e);
        }
    }
}

main().finally(() => prisma.$disconnect());
