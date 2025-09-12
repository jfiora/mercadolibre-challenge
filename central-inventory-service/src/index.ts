import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../generated/prisma';
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
    const reservation = await prisma.reservation.create({
        data: {
            sku,
            qty,
            status: 'reserved',
        },
    });
    res.status(201).json(reservation);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
