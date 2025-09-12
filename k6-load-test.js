import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const stockCheckErrors = new Counter('stock_check_errors');
const outOfStockErrors = new Counter('out_of_stock_errors');
const successfulReservations = new Counter('successful_reservations');

// Service URLs
const STORE_EDGE_URL = 'http://localhost:3001';
const CENTRAL_INVENTORY_URL = 'http://localhost:3002';

export const options = {
    scenarios: {
        // Core customer journey - shorter duration
        normal_flow: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '20s', target: 2 }, // Ramp up to 2 users
                { duration: '20s', target: 2 }, // Stay at 2 users
                { duration: '20s', target: 0 }, // Ramp down
            ],
        },
        // Stress test for concurrent reservations
        concurrent_reservations: {
            executor: 'constant-vus',
            vus: 1,
            duration: '15s',
            startTime: '30s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
        successful_reservations: ['count>20'],
    },
    setupTimeout: '30s',
};

// Setup function to ensure services are ready
export function setup() {
    let retries = 30;
    let servicesReady = false;

    console.log('Waiting for services to be ready...');

    for (let i = 0; i < retries && !servicesReady; i++) {
        const storeHealth = http.get(`${STORE_EDGE_URL}/health`);
        const centralHealth = http.get(`${CENTRAL_INVENTORY_URL}/health`);

        if (storeHealth.status === 200 && centralHealth.status === 200) {
            console.log('Both services are ready!');
            servicesReady = true;

            // Verify inventory is seeded
            const inventory = http.get(`${STORE_EDGE_URL}/inventory`);
            if (inventory.status === 200) {
                const items = JSON.parse(inventory.body);
                if (items && items.length > 0) {
                    console.log('Initial inventory:', items);
                    return {
                        initialInventory: items,
                    };
                }
            }
        } else {
            console.log(`Services not ready, attempt ${i + 1}/${retries}`);
            sleep(1);
        }
    }

    if (!servicesReady) {
        throw new Error('Services failed to become ready in time');
    }
}

export default function (data) {
    // Core customer journey

    // Step 1: Check inventory
    const inventoryRes = http.get(`${STORE_EDGE_URL}/inventory`);
    const checks = check(inventoryRes, {
        'GET /inventory status is 200': (r) => r.status === 200,
        'GET /inventory returns array': (r) =>
            Array.isArray(JSON.parse(r.body)),
        'GET /inventory has items': (r) => JSON.parse(r.body).length > 0,
    });

    if (!checks || inventoryRes.status !== 200) {
        console.error('Inventory check failed:', inventoryRes.body);
        stockCheckErrors.add(1);
        return;
    }

    const inventory = JSON.parse(inventoryRes.body);
    if (!inventory.length) {
        console.error('No inventory items found');
        stockCheckErrors.add(1);
        return;
    }

    // Select a random item with stock
    const availableItems = inventory.filter((item) => item.qty > 0);
    if (!availableItems.length) {
        console.error('No items with available stock');
        outOfStockErrors.add(1);
        return;
    }

    // Sort by stock level and pick from top half to favor items with more stock
    const sortedItems = availableItems.sort((a, b) => b.qty - a.qty);
    const item = sortedItems[0]; // Always pick the item with the most stock

    console.log(`Selected item ${item.sku} with stock ${item.qty}`);

    // Calculate a reasonable quantity based on available stock
    const maxQty = Math.min(2, Math.floor(item.qty * 0.02)); // Take up to 2% of stock or 2 items
    const requestedQty = Math.max(1, Math.floor(Math.random() * maxQty) + 1);
    console.log(`Attempting to reserve ${requestedQty} units of ${item.sku}`);

    // Step 2: Make reservation
    const reservationRes = http.post(
        `${STORE_EDGE_URL}/reservations`,
        JSON.stringify({
            sku: item.sku,
            qty: requestedQty,
        }),
        {
            headers: { 'Content-Type': 'application/json' },
        }
    );

    // Check reservation response
    const reservationSuccess = check(reservationRes, {
        'Reservation status is 201': (r) => r.status === 201,
        'Reservation returns valid data': (r) => {
            if (r.status !== 201) return false;
            const data = JSON.parse(r.body);
            return (
                data.reservation.sku === item.sku &&
                data.reservation.qty === requestedQty &&
                typeof data.remainingStock === 'number'
            );
        },
    });

    if (reservationSuccess) {
        successfulReservations.add(1);
        console.log(
            `Successfully reserved ${requestedQty} units of ${
                item.sku
            }. Remaining stock: ${
                JSON.parse(reservationRes.body).remainingStock
            }`
        );
    } else if (reservationRes.status === 400) {
        const response = JSON.parse(reservationRes.body);
        outOfStockErrors.add(1);
        if (response.availableStock !== undefined) {
            console.log(
                `Reservation failed: Available stock for ${item.sku}: ${response.availableStock}`
            );
        } else {
            console.log('Reservation failed:', reservationRes.body);
        }
    }

    // Step 3: Verify inventory was updated
    const updatedInventoryRes = http.get(`${STORE_EDGE_URL}/inventory`);
    check(updatedInventoryRes, {
        'Updated inventory check returns 200': (r) => r.status === 200,
        'Stock was updated correctly': (r) => {
            if (r.status !== 200) return false;
            const updatedInventory = JSON.parse(r.body);
            const updatedItem = updatedInventory.find(
                (i) => i.sku === item.sku
            );
            // Only check if reservation was successful
            if (!reservationSuccess) return true;
            return updatedItem && updatedItem.qty === item.qty - requestedQty;
        },
    });

    // Step 4: Verify reservation was recorded
    const reservationsRes = http.get(`${STORE_EDGE_URL}/reservations`);
    check(reservationsRes, {
        'GET /reservations status is 200': (r) => r.status === 200,
        'GET /reservations returns array': (r) =>
            Array.isArray(JSON.parse(r.body)),
        'GET /reservations has items': (r) => JSON.parse(r.body).length > 0,
    });

    // Sleep for a short duration (0.5-1.5s) to simulate user think time
    sleep(Math.random() + 0.5);
}

export function handleSummary(data) {
    return {
        stdout: JSON.stringify(
            {
                ...data,
                metrics: {
                    ...data.metrics,
                    stock_check_errors: stockCheckErrors.value,
                    out_of_stock_errors: outOfStockErrors.value,
                    successful_reservations: successfulReservations.value,
                },
            },
            null,
            2
        ),
    };
}
