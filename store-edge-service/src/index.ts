import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';
import { randomInt } from 'crypto';
import axios from 'axios';

const app = express();
const prisma = new PrismaClient();

const CENTRAL_INVENTORY_URL =
    process.env.CENTRAL_INVENTORY_URL ||
    'http://central-inventory-service:3002';

app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode}`);
    });
    next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// GET /health
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'store-edge' });
});

// GET /inventory
app.get('/inventory', async (req: Request, res: Response) => {
    try {
        // Fetch inventory from central-inventory-service
        const response = await axios.get(`${CENTRAL_INVENTORY_URL}/inventory`);
        res.json(response.data);
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /inventory
app.post('/inventory', async (req: Request, res: Response) => {
    const { sku, qty } = req.body;
    try {
        // Forward the update to central-inventory-service
        const response = await axios.post(
            `${CENTRAL_INVENTORY_URL}/inventory`,
            { sku, qty }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Failed to update inventory:', error);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

// Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
    const totalReservationsCreated = 150; // Mocked value
    const failedReservations = 10; // Mocked value
    const avgReservationLatencyMs = randomInt(50, 150); // Mocked random value

    try {
        // Fetch stock levels from central-inventory-service
        const response = await axios.get(`${CENTRAL_INVENTORY_URL}/inventory`);
        const stockLevels = response.data;

        const stockMetrics = stockLevels
            .map(
                (item: { sku: string; qty: number }) =>
                    `stock_level{sku="${item.sku}"} ${item.qty}`
            )
            .join('\n');

        const metrics = `# HELP total_reservations_created Total number of reservations created\n# TYPE total_reservations_created counter\ntotal_reservations_created ${totalReservationsCreated}\n
# HELP failed_reservations Total number of failed reservations\n# TYPE failed_reservations counter\nfailed_reservations ${failedReservations}\n
# HELP avg_reservation_latency_ms Average reservation latency in ms\n# TYPE avg_reservation_latency_ms gauge\navg_reservation_latency_ms ${avgReservationLatencyMs}\n
# HELP stock_level Current stock levels per product\n# TYPE stock_level gauge\n${stockMetrics}`;

        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
