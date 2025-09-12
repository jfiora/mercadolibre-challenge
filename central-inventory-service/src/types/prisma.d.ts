import { PrismaClient } from '@prisma/client';

declare global {
    namespace jest {
        interface Matchers<R> {
            toContainObject(object: any): R;
        }
    }
}

declare module '@prisma/client' {
    interface PrismaClient {
        inventory: {
            deleteMany: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
            findUnique: jest.Mock;
            delete: jest.Mock;
        };
        reservation: {
            deleteMany: jest.Mock;
            create: jest.Mock;
            createMany: jest.Mock;
            update: jest.Mock;
            findUnique: jest.Mock;
            findMany: jest.Mock;
            delete: jest.Mock;
        };
    }
}
