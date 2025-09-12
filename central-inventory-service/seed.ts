import { PrismaClient } from './generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    // Add mock data for Inventory
    await prisma.inventory.createMany({
        data: [
            { sku: 'sku123', qty: 100 },
            { sku: 'sku456', qty: 200 },
        ],
    });

    // Add mock data for Reservation
    await prisma.reservation.createMany({
        data: [
            {
                sku: 'sku123',
                qty: 10,
                status: 'reserved',
                createdAt: new Date(),
            },
            {
                sku: 'sku456',
                qty: 20,
                status: 'reserved',
                createdAt: new Date(),
            },
        ],
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
