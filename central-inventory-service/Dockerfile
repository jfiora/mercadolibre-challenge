FROM node:20-slim

WORKDIR /app

# Install OpenSSL first
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and prisma files
COPY . .

# Set DATABASE_URL for Prisma
ENV DATABASE_URL="file:/app/prisma/dev.db"

# Clean up any existing generated client and database
RUN rm -rf generated/prisma prisma/dev.db

# Generate Prisma client and run migrations
RUN npx prisma generate
RUN npx prisma migrate deploy

# Expose the service port
EXPOSE 3002

# Start the service in development mode
CMD ["npm", "run", "dev"]