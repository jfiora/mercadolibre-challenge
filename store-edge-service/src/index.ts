import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';

const app = express();
const prisma = new PrismaClient();

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
        const inventory = await prisma.inventory.findMany();
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /inventory
app.post('/inventory', async (req: Request, res: Response) => {
    const { sku, qty } = req.body;
    try {
        const item = await prisma.inventory.upsert({
            where: { sku },
            update: { qty, updatedAt: new Date() },
            create: { sku, qty },
        });
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
