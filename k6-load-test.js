import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    // Test configuration
    scenarios: {
        // Common load test
        load_test: {
            executor: 'ramping-vus',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 10 }, // Ramp up to 10 VUs over 30s
                { duration: '1m', target: 10 }, // Stay at 10 VUs for 1m
                { duration: '30s', target: 0 }, // Ramp down to 0 VUs over 30s
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
        http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    },
};

export default function () {
    // Step 1: GET /inventory from store-edge-service
    const res1 = http.get('http://localhost:3001/inventory');
    check(res1, {
        'GET /inventory status is 200': (r) => r.status === 200,
        'GET /inventory returns array': (r) =>
            Array.isArray(JSON.parse(r.body)),
        'GET /inventory has items': (r) => JSON.parse(r.body).length > 0,
    });

    // Step 2: POST /reservations to central-inventory-service
    const payload = JSON.stringify({
        sku: 'sku123',
        qty: 1,
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
        'POST /reservations status is 201': (r) => r.status === 201,
        'POST /reservations returns valid response': (r) => {
            const body = JSON.parse(r.body);
            return (
                body.id &&
                body.sku === 'sku123' &&
                body.qty === 1 &&
                body.status === 'reserved'
            );
        },
    });

    // Step 3: GET /reservations to verify
    const res3 = http.get('http://localhost:3002/reservations');
    check(res3, {
        'GET /reservations status is 200': (r) => r.status === 200,
        'GET /reservations returns array': (r) =>
            Array.isArray(JSON.parse(r.body)),
        'GET /reservations has items': (r) => JSON.parse(r.body).length > 0,
    });

    // Sleep for a random duration between 1-2s to simulate user think time
    sleep(Math.random() * 1 + 1);
}

// Print summary at the end
export function handleSummary(data) {
    return {
        stdout: JSON.stringify(data, null, 2),
    };
}
