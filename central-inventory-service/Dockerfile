FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./

RUN npm install

COPY . .

ENV DATABASE_URL="file:/app/prisma/dev.db"

RUN rm -rf generated/prisma prisma/dev.db

RUN npx prisma generate
RUN npx prisma migrate deploy

EXPOSE 3002

CMD ["npm", "run", "dev"]