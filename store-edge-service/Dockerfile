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

# Clean up any existing generated client
RUN rm -rf generated/prisma

# Generate Prisma client with the correct binary
RUN npx prisma generate

# Expose the service port
EXPOSE 3001

# Start the service in development mode
CMD ["npm", "run", "dev"]