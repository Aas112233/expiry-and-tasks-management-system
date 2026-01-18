import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing DB Connection...");
    try {
        await prisma.$connect();
        console.log("Successfully connected to DB!");
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);
    } catch (e: any) {
        console.error("CONNECTION FAILED:");
        console.error(e.message);
        console.error("----- Full Error -----");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
