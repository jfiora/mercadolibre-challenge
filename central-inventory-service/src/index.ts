import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const MIN_QUANTITY = 1;
const INITIAL_STOCK = {
    sku123: 1000,
    sku456: 2000,
    sku789: 3000,
};

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'central-inventory' });
});

app.get('/inventory', async (req: Request, res: Response) => {
    try {
        const inventory = await prisma.inventory.findMany({
            orderBy: { sku: 'asc' },
        });
        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

app.get('/inventory/:sku', async (req: Request, res: Response) => {
    try {
        const { sku } = req.params;
        const item = await prisma.inventory.findUnique({
            where: { sku },
        });

        if (!item) {
            return res.status(404).json({ error: 'SKU not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
});

app.put('/inventory/:sku', async (req: Request, res: Response) => {
    try {
        const { sku } = req.params;
        const { qty } = req.body;

        if (typeof qty !== 'number' || qty < 0) {
            return res
                .status(400)
                .json({ error: 'Quantity must be a non-negative number' });
        }

        const item = await prisma.inventory.update({
            where: { sku },
            data: { qty },
        });

        res.json(item);
    } catch (error) {
        console.error('Error updating inventory:', error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

app.get('/reservations', async (req: Request, res: Response) => {
    try {
        const reservations = await prisma.reservation.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(reservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

app.post('/reservations', async (req: Request, res: Response) => {
    const { sku, qty } = req.body;

    // Input validation
    if (!sku || typeof sku !== 'string') {
        return res.status(400).json({ error: 'Invalid SKU' });
    }

    if (!qty || typeof qty !== 'number' || qty < MIN_QUANTITY) {
        return res
            .status(400)
            .json({ error: 'Quantity must be a positive number' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findUnique({
                where: { sku },
            });

            if (!inventory) {
                throw new Error('SKU_NOT_FOUND');
            }

            if (inventory.qty < qty) {
                throw new Error(`INSUFFICIENT_STOCK:${inventory.qty}`);
            }

            const reservation = await tx.reservation.create({
                data: {
                    sku,
                    qty,
                    status: 'reserved',
                },
            });

            const updatedInventory = await tx.inventory.update({
                where: { sku },
                data: {
                    qty: inventory.qty - qty,
                },
            });

            return {
                reservation,
                remainingStock: updatedInventory.qty,
            };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating reservation:', error);

        if (error instanceof Error) {
            if (error.message.startsWith('INSUFFICIENT_STOCK:')) {
                const availableStock = parseInt(error.message.split(':')[1]);
                return res.status(400).json({
                    error: 'Insufficient stock',
                    availableStock,
                });
            }

            switch (error.message) {
                case 'SKU_NOT_FOUND':
                    return res.status(400).json({ error: 'Invalid SKU' });
                default:
                    return res
                        .status(500)
                        .json({ error: 'Failed to create reservation' });
            }
        }

        res.status(500).json({ error: 'Failed to create reservation' });
    }
});

app.get('/metrics', async (req: Request, res: Response) => {
    try {
        const [reservations, stockLevels] = await Promise.all([
            prisma.reservation.count(),
            prisma.inventory.findMany({
                select: { sku: true, qty: true },
            }),
        ]);

        const stockMetrics = stockLevels
            .map((item) => `stock_level{sku="${item.sku}"} ${item.qty}`)
            .join('\n');

        const metrics = `# HELP total_reservations_created Total number of reservations created
# TYPE total_reservations_created counter
total_reservations_created ${reservations}

# HELP stock_level Current stock levels per product
# TYPE stock_level gauge
${stockMetrics}`;

        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    } catch (error) {
        console.error('Error generating metrics:', error);
        res.status(500).json({ error: 'Failed to generate metrics' });
    }
});

async function initData() {
    try {
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS Inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            qty INTEGER NOT NULL
        )`;

        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS Reservation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT NOT NULL,
            qty INTEGER NOT NULL,
            status TEXT NOT NULL,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`;

        await prisma.reservation.deleteMany({});
        await prisma.inventory.deleteMany({});

        console.log('Seeding mock inventory data...');

        const createdItems = await prisma.inventory.createMany({
            data: Object.entries(INITIAL_STOCK).map(([sku, qty]) => ({
                sku,
                qty,
            })),
        });

        const seededInventory = await prisma.inventory.findMany();
        console.log('Seeded inventory:', seededInventory);
        console.log(`Created ${createdItems.count} inventory items`);

        return seededInventory;
    } catch (error) {
        console.error('Error in initData:', error);
        throw error;
    }
}

initData()
    .then((inventory) => {
        const PORT = process.env.PORT || 3002;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('Initial inventory:', inventory);
        });
    })
    .catch((error) => {
        console.error('Error initializing data:', error);
        process.exit(1);
    });
