import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';
import { randomInt } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    res.on('finish', () => {
        console.log(`Status: ${res.statusCode}`);
    });
    next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'central-inventory' });
});

// Get all reservations
app.get('/reservations', async (req: Request, res: Response) => {
    const reservations = await prisma.reservation.findMany();
    res.json(reservations);
});

// Create a reservation
app.post('/reservations', async (req: Request, res: Response) => {
    const { sku, qty } = req.body;

    // Log the incoming request body
    console.log('Request body:', req.body);

    // Check if sku and qty are provided
    if (!sku || !qty) {
        console.log('Missing sku or qty in request body');
        return res.status(400).json({ error: 'sku and qty are required' });
    }

    try {
        const reservation = await prisma.reservation.create({
            data: {
                sku,
                qty,
                status: 'reserved',
            },
        });
        res.status(201).json(reservation);
    } catch (error) {
        console.error('Error creating reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all inventory
app.get('/inventory', async (req: Request, res: Response) => {
    try {
        const inventory = await prisma.inventory.findMany();
        res.json(inventory);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
    const totalReservationsCreated = 100; // Mocked value
    const failedReservations = 5; // Mocked value
    const avgReservationLatencyMs = randomInt(50, 150); // Mocked random value

    // Fetch stock levels from the database
    const stockLevels = await prisma.inventory.findMany({
        select: { sku: true, qty: true },
    });

    const stockMetrics = stockLevels
        .map(
            (item: { sku: string; qty: number }) =>
                `stock_level{sku=\"${item.sku}\"} ${item.qty}`
        )
        .join('\n');

    const metrics = `# HELP total_reservations_created Total number of reservations created\n# TYPE total_reservations_created counter\ntotal_reservations_created ${totalReservationsCreated}\n
# HELP failed_reservations Total number of failed reservations\n# TYPE failed_reservations counter\nfailed_reservations ${failedReservations}\n
# HELP avg_reservation_latency_ms Average reservation latency in ms\n# TYPE avg_reservation_latency_ms gauge\navg_reservation_latency_ms ${avgReservationLatencyMs}\n
# HELP stock_level Current stock levels per product\n# TYPE stock_level gauge\n${stockMetrics}`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

async function initData() {
    try {
        // Create tables if they don't exist
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS Inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE,
            qty INTEGER
        )`;

        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS Reservation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT,
            qty INTEGER,
            status TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

        // Check if inventory table is empty
        const count = await prisma.inventory.count();
        console.log(`Current inventory count: ${count}`);

        if (count === 0) {
            console.log('Seeding mock inventory data...');
            await prisma.inventory.createMany({
                data: [
                    { sku: 'sku123', qty: 50 },
                    { sku: 'sku456', qty: 20 },
                    { sku: 'sku789', qty: 100 },
                ],
            });
            console.log('Mock inventory data seeded.');
        } else {
            console.log('Inventory table already has data.');
        }
    } catch (error) {
        console.error('Error in initData:', error);
        throw error;
    }
}

// Call initData before starting the server
initData()
    .then(() => {
        const PORT = process.env.PORT || 3002;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error initializing data:', error);
    });
