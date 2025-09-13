// generate store-edge service

You are an expert software engineer. Generate a TypeScript (Node.js + Express or Fastify) API project called `store-edge-service`.

Requirements:

-   Language: TypeScript
-   Persistence: SQLite (using Prisma ORM or better-sqlite3)
-   API basic endpoints:
    -   `GET /health` → return `{status: "ok", service: "store-edge"}`
    -   `GET /inventory` → list all inventory items from the SQLite DB
    -   `POST /inventory` → add or update stock for a given `sku` and `qty`
-   DB schema: table `inventory` with fields:
    -   `id` (int, autoincrement, pk)
    -   `sku` (string, unique)
    -   `qty` (int)
    -   `updatedAt` (datetime)
-   Add simple logging middleware for all requests (method, path, status code).
-   Add error handler middleware (return JSON errors).
-   Package.json scripts: `dev`, `build`, `start`.
-   Include an initial SQLite migration to create the `inventory` table.
-   Output: Full project code (package.json, tsconfig, src files, prisma schema or SQL init).

// generate central-inventory service

You are an expert software engineer. Generate a TypeScript (Node.js + Express) API project called `central-inventory-service`.

Requirements:

-   Language: TypeScript
-   Persistence: SQLite (using Prisma ORM)
-   API basic endpoints:
    -   `GET /health` → return `{status: "ok", service: "central-inventory"}`
    -   `GET /reservations` → list all reservations
    -   `POST /reservations` → create a reservation with body `{sku: string, qty: number}`
-   DB schema:
    -   Table `reservations` with fields:
        -   `id` (int, autoincrement, pk)
        -   `sku` (string)
        -   `qty` (int)
        -   `status` (string: reserved|committed|cancelled)
        -   `createdAt` (datetime)
-   Add simple logging middleware for all requests (method, path, status code).
-   Add error handler middleware (return JSON errors).
-   Package.json scripts: `dev`, `build`, `start`.
-   Include an initial SQLite migration to create the `reservations` table.
-   Output: Full project code (package.json, tsconfig, src files, prisma schema or SQL init).

// generate docker compose

You are an expert DevOps + Prisma engineer.  
I have two TypeScript services (`store-edge-service` on port 3001 and `central-inventory-service` on port 3002).  
Both use **Prisma + SQLite** as persistence. I am developing on a Mac M1 (ARM64) and I need a working Docker setup.

Please generate the following:

1. **schema.prisma fix**

    - In both services, modify `schema.prisma` so the generator section includes:
        ```prisma
        generator client {
          provider = "prisma-client-js"
          binaryTargets = ["native", "linux-musl"]
        }
        ```

2. **Dockerfile for each service**

    - Use `node:20-slim` instead of Alpine to avoid musl binary incompatibilities.
    - Install dependencies, copy code, run `npx prisma generate` inside the container (so binaries match the container’s OS).
    - Expose the correct port (`3001` for store-edge, `3002` for central-inventory).
    - Run with `npm run dev` as CMD.

3. **docker-compose.yml** at the project root:

    - Define both services:
        - `store-edge-service` → build from `./store-edge-service`, expose `3001:3001`.
        - `central-inventory-service` → build from `./central-inventory-service`, expose `3002:3002`.
    - Add volumes so I can hot reload changes from local code (`.:/app`).
    - Set restart policy `unless-stopped`.
    - Place both in the same network so they can reach each other with `http://store-edge-service:3001` and `http://central-inventory-service:3002`.
    - Add `depends_on` so `store-edge-service` waits for `central-inventory-service`.

4. Output:
    - Full `schema.prisma` (just the generator + datasource block).
    - Full `Dockerfile` for each service.
    - Full `docker-compose.yml`.
    - Clear instructions on how to run (`docker-compose up --build`) and how to test health endpoints.

// create concurrency tests

You are an expert performance engineer.
Write a k6 script to load test my inventory system composed of:

-   central-inventory-service on http://localhost:3002
-   store-edge-service on http://localhost:3001

Requirements:

-   Simulate 50 virtual users during 30s.
-   Each user flow:
    1. GET /inventory/sku123 from store-edge-service
    2. POST /reservations to central-inventory-service with { productId: "sku123", storeId: "store1", quantity: 1 }
-   Capture response times and success rates.
-   Print summary at the end.

// create run.md
can you create a run.md file which contains how to run the project
docker-compose
k6 tests
unit test
it has to be simple and consice
