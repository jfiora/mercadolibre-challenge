# MercadoLibre Challenge - Testing Guide

## Running Tests

### Prerequisites

-   Node.js installed
-   npm installed
-   Both services should have their dependencies installed and Prisma client generated

### Installation

```bash
# Install root-level dependencies
npm install

# Install dependencies for both services and generate Prisma clients
cd store-edge-service && npm install && npm run prisma:generate && cd ..
cd central-inventory-service && npm install && npm run prisma:generate && cd ..
```

### Running Tests

#### Run all tests once

```bash
npm test
```

This will run tests for both services sequentially.

#### Run tests for individual services

```bash
# Run store-edge-service tests
npm run test:store-edge

# Run central-inventory-service tests
npm run test:central
```

#### Watch Mode

```bash
# Run all tests in watch mode (both services concurrently)
npm run test:watch

# Run individual service tests in watch mode
npm run test:store-edge:watch
npm run test:central:watch
```

### Test Coverage

Each service's tests include:

-   Inventory model CRUD operations
-   Data validation
-   Unique constraint testing
-   Timestamp validations
-   Reservation model operations (central-inventory-service only)
