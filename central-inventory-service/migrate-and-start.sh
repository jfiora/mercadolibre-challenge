#!/bin/sh

# Wait for a moment to ensure the database is ready
sleep 2

# Create the migrations directory if it doesn't exist
mkdir -p prisma/migrations

# Run migrations
echo "Running migrations..."
npx prisma migrate reset --force

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Start the application
echo "Starting the application..."
npm run dev