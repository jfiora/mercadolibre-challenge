# Running the Project

## Quick Start

```bash
# Start all services
docker-compose up -d

# Services will be available at:
# - Store Edge Service: http://localhost:3001
# - Central Inventory Service: http://localhost:3002
```

## Unit Tests

```bash
# Install dependencies and run all tests
npm install
npm test

# Run specific service tests
npm run test:store-edge    # Store Edge Service tests
npm run test:central       # Central Inventory Service tests

# Watch mode for development
npm run test:watch
```

## Load Tests (k6)

```bash
# Install k6 (if not installed)
brew install k6  # macOS
# or
docker pull grafana/k6  # Docker

# Run load tests
k6 run k6-load-test.js

# With Docker
docker run -i grafana/k6 run - <k6-load-test.js
```

## Development

```bash
# Start services individually
cd store-edge-service
npm install
npm run dev

cd central-inventory-service
npm install
npm run dev
```
