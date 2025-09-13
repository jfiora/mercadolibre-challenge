import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const stockCheckErrors = new Counter('stock_check_errors');
const outOfStockErrors = new Counter('out_of_stock_errors');
const successfulReservations = new Counter('successful_reservations');
const concurrentErrors = new Counter('concurrent_errors');

const STORE_EDGE_URL = 'http://localhost:3001';
const CENTRAL_INVENTORY_URL = 'http://localhost:3002';

export const options = {
    scenarios: {
        // Core customer journey - shorter duration
        normal_flow: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '20s', target: 2 },
                { duration: '20s', target: 2 },
                { duration: '20s', target: 0 },
            ],
        },
        // Stress test for concurrent reservations
        concurrent_reservations: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '10s', target: 3 },
                { duration: '10s', target: 5 },
                { duration: '10s', target: 0 },
            ],
            startTime: '30s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
        successful_reservations: ['count>30'],
    },
    setupTimeout: '30s',
};

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

    // Distribute load evenly across all items with stock
    const item =
        availableItems[Math.floor(Math.random() * availableItems.length)];
    console.log(`Selected item ${item.sku} with stock ${item.qty}`);

    // Calculate a reasonable quantity based on available stock
    const maxQty = Math.min(2, Math.floor(item.qty * 0.01)); // Take up to 1% of stock or 2 items
    const requestedQty = Math.max(1, Math.floor(Math.random() * maxQty) + 1);
    console.log(`Attempting to reserve ${requestedQty} units of ${item.sku}`);

    // Step 2: Make reservation with retry for concurrent errors
    let retries = 3;
    let reservationSuccess = false;
    let reservationRes;

    while (retries > 0 && !reservationSuccess) {
        reservationRes = http.post(
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
        reservationSuccess = check(reservationRes, {
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
            break;
        } else if (reservationRes.status === 400) {
            const response = JSON.parse(reservationRes.body);
            if (response.error === 'Insufficient stock') {
                outOfStockErrors.add(1);
                console.log(
                    `Reservation failed: Available stock for ${item.sku}: ${response.availableStock}`
                );
                break;
            }
            // For other 400 errors, retry
            retries--;
            if (retries > 0) {
                console.log(
                    `Reservation attempt failed, retrying... (${retries} attempts left)`
                );
                sleep(0.1); // Small delay between retries
            }
        } else {
            // For 500 errors or other issues, retry
            retries--;
            if (retries > 0) {
                console.log(
                    `Reservation attempt failed, retrying... (${retries} attempts left)`
                );
                sleep(0.1); // Small delay between retries
            }
        }
    }

    if (!reservationSuccess && retries === 0) {
        concurrentErrors.add(1);
        console.log('All reservation attempts failed');
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
            // Allow for concurrent updates by checking if stock decreased
            return updatedItem && updatedItem.qty <= item.qty - requestedQty;
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
                    concurrent_errors: concurrentErrors.value,
                },
            },
            null,
            2
        ),
    };
}
