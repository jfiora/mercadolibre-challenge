import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '30s',
};

export default function () {
    // Step 1: GET /inventory/sku123 from store-edge-service
    const res1 = http.get('http://localhost:3001/inventory/sku123');
    check(res1, {
        'GET /inventory/sku123 status is 200': (r) => r.status === 200,
    });

    // Step 2: POST /reservations to central-inventory-service
    const payload = JSON.stringify({
        productId: 'sku123',
        storeId: 'store1',
        quantity: 1,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res2 = http.post(
        'http://localhost:3002/reservations',
        payload,
        params
    );
    check(res2, {
        'POST /reservations status is 200': (r) => r.status === 200,
    });

    // Sleep for a short duration to simulate user think time
    sleep(1);
}

// Print summary at the end
export function handleSummary(data) {
    return {
        stdout: JSON.stringify(data, null, 2),
    };
}
