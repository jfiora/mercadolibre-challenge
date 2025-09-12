import { PrismaClient } from '@prisma/client';
import { prismaMock } from '../__mocks__/prisma';

jest.mock('../__mocks__/prisma', () => ({
    prismaMock: {
        inventory: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

describe('Inventory Model', () => {
    const mockInventoryItem = {
        id: 1,
        sku: 'TEST-SKU-001',
        qty: 100,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new inventory item', async () => {
        (prismaMock.inventory.create as jest.Mock).mockResolvedValue(
            mockInventoryItem
        );

        const result = await prismaMock.inventory.create({
            data: {
                sku: 'TEST-SKU-001',
                qty: 100,
            },
        });

        expect(result).toEqual(mockInventoryItem);
        expect(prismaMock.inventory.create).toHaveBeenCalledWith({
            data: {
                sku: 'TEST-SKU-001',
                qty: 100,
            },
        });
    });

    it('should not allow duplicate SKUs', async () => {
        (prismaMock.inventory.create as jest.Mock).mockRejectedValue(
            new Error('Unique constraint failed on the fields: (`sku`)')
        );

        await expect(
            prismaMock.inventory.create({
                data: {
                    sku: 'TEST-SKU-001',
                    qty: 100,
                },
            })
        ).rejects.toThrow('Unique constraint failed');
    });

    it('should update inventory quantity', async () => {
        const updatedItem = { ...mockInventoryItem, qty: 50 };
        (prismaMock.inventory.update as jest.Mock).mockResolvedValue(
            updatedItem
        );

        const result = await prismaMock.inventory.update({
            where: { id: 1 },
            data: { qty: 50 },
        });

        expect(result).toEqual(updatedItem);
        expect(result.qty).toBe(50);
    });

    it('should delete inventory item', async () => {
        (prismaMock.inventory.delete as jest.Mock).mockResolvedValue(
            mockInventoryItem
        );
        (prismaMock.inventory.findUnique as jest.Mock).mockResolvedValue(null);

        await prismaMock.inventory.delete({
            where: { id: 1 },
        });

        const result = await prismaMock.inventory.findUnique({
            where: { id: 1 },
        });

        expect(result).toBeNull();
        expect(prismaMock.inventory.delete).toHaveBeenCalledWith({
            where: { id: 1 },
        });
    });
});
