import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Database Connection Test ---');

    try {
        // 1. Connection Check
        console.log('1. Checking Connection...');
        await prisma.inventoryItem.count();
        console.log('   [SUCCESS] Connected to MongoDB!');

        // 2. Create (Insert) Data
        console.log('2. Testing INSERT (Creating a Test Item)...');
        const newItem = await prisma.inventoryItem.create({
            data: {
                productName: 'DB_TEST_ITEM_' + Date.now(),
                quantity: 10,
                mfgDate: new Date(),
                expDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                branch: 'Test Branch',
                status: 'Active'
            },
        });
        console.log(`   [SUCCESS] Created item with ID: ${newItem.id}`);

        // 3. Read (Get) Data
        console.log('3. Testing READ (Fetching the Created Item)...');
        const fetchedItem = await prisma.inventoryItem.findUnique({
            where: { id: newItem.id },
        });
        if (fetchedItem && fetchedItem.productName === newItem.productName) {
            console.log(`   [SUCCESS] Fetched item: ${fetchedItem.productName}`);
        } else {
            throw new Error('Fetched item does not match created item.');
        }

        // 4. Update (Put/Patch) Data
        console.log('4. Testing UPDATE (Modifying the Item)...');
        const updatedItem = await prisma.inventoryItem.update({
            where: { id: newItem.id },
            data: { quantity: 50 },
        });
        if (updatedItem.quantity === 50) {
            console.log(`   [SUCCESS] Updated item quantity to: ${updatedItem.quantity}`);
        } else {
            throw new Error('Update failed.');
        }

        // 5. Delete Data
        console.log('5. Testing DELETE (Removing the Item)...');
        await prisma.inventoryItem.delete({
            where: { id: newItem.id },
        });

        // Verify deletion
        const deletedItem = await prisma.inventoryItem.findUnique({
            where: { id: newItem.id },
        });

        if (!deletedItem) {
            console.log('   [SUCCESS] Item successfully deleted (not found in DB).');
        } else {
            throw new Error('Delete failed, item still exists.');
        }

        console.log('--- All Database Operations Tested Successfully! ---');

    } catch (error) {
        console.error('   [X] TEST FAILED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
