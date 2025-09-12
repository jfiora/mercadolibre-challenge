import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const CENTRAL_INVENTORY_URL =
    process.env.CENTRAL_INVENTORY_URL ||
    'http://central-inventory-service:3002';

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
    try {
        // Check central service health
        const healthCheck = await axios.get(`${CENTRAL_INVENTORY_URL}/health`);
        if (healthCheck.status === 200) {
            res.json({ status: 'ok', service: 'store-edge' });
        } else {
            res.status(503).json({
                status: 'error',
                message: 'Central inventory service is not healthy',
            });
        }
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            message: 'Central inventory service is not available',
        });
    }
});

// Get all inventory
app.get('/inventory', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(`${CENTRAL_INVENTORY_URL}/inventory`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Get inventory by SKU
app.get('/inventory/:sku', async (req: Request, res: Response) => {
    try {
        const { sku } = req.params;
        const response = await axios.get(
            `${CENTRAL_INVENTORY_URL}/inventory/${sku}`
        );
        res.json(response.data);
    } catch (error: any) {
        console.error('Error fetching inventory item:', error);
        if (error.response?.status === 404) {
            res.status(404).json({ error: 'SKU not found' });
        } else {
            res.status(500).json({ error: 'Failed to fetch inventory item' });
        }
    }
});

// Create a reservation
app.post('/reservations', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(
            `${CENTRAL_INVENTORY_URL}/reservations`,
            req.body,
            {
                headers: { 'Content-Type': 'application/json' },
            }
        );
        res.status(201).json(response.data);
    } catch (error: any) {
        console.error('Error creating reservation:', error);
        if (error.response) {
            // Forward the error response from the central service
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Failed to create reservation' });
        }
    }
});

// Get all reservations
app.get('/reservations', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(
            `${CENTRAL_INVENTORY_URL}/reservations`
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations' });
    }
});

// Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(`${CENTRAL_INVENTORY_URL}/metrics`, {
            headers: { Accept: 'text/plain' },
        });
        res.set('Content-Type', 'text/plain');
        res.send(response.data);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// Wait for central service to be ready
async function waitForCentralService(
    maxRetries: number = 30,
    retryInterval: number = 1000
): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.get(`${CENTRAL_INVENTORY_URL}/health`);
            if (response.status === 200) {
                console.log('Central inventory service is ready');
                return;
            }
        } catch (error) {
            console.log(
                `Waiting for central inventory service... (${
                    i + 1
                }/${maxRetries})`
            );
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
    throw new Error('Central inventory service failed to become ready');
}

// Start the server
const PORT = process.env.PORT || 3001;

waitForCentralService()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
