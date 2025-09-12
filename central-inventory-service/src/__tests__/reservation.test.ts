import { PrismaClient } from '@prisma/client';
import { prismaMock } from '../__mocks__/prisma';

jest.mock('../__mocks__/prisma', () => ({
    prismaMock: {
        reservation: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

describe('Reservation Model', () => {
    const mockReservation = {
        id: 1,
        sku: 'TEST-SKU-001',
        qty: 5,
        status: 'PENDING',
        createdAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a new reservation', async () => {
        (prismaMock.reservation.create as jest.Mock).mockResolvedValue(
            mockReservation
        );

        const result = await prismaMock.reservation.create({
            data: {
                sku: 'TEST-SKU-001',
                qty: 5,
                status: 'PENDING',
            },
        });

        expect(result).toEqual(mockReservation);
        expect(prismaMock.reservation.create).toHaveBeenCalledWith({
            data: {
                sku: 'TEST-SKU-001',
                qty: 5,
                status: 'PENDING',
            },
        });
    });

    it('should update reservation status', async () => {
        const updatedReservation = { ...mockReservation, status: 'CONFIRMED' };
        (prismaMock.reservation.update as jest.Mock).mockResolvedValue(
            updatedReservation
        );

        const result = await prismaMock.reservation.update({
            where: { id: 1 },
            data: { status: 'CONFIRMED' },
        });

        expect(result.status).toBe('CONFIRMED');
        expect(prismaMock.reservation.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { status: 'CONFIRMED' },
        });
    });

    it('should find reservations by SKU', async () => {
        const mockReservations = [
            { ...mockReservation, id: 1, qty: 1 },
            { ...mockReservation, id: 2, qty: 2 },
        ];

        (prismaMock.reservation.findMany as jest.Mock).mockResolvedValue(
            mockReservations
        );

        const result = await prismaMock.reservation.findMany({
            where: { sku: 'TEST-SKU-001' },
        });

        expect(result).toHaveLength(2);
        expect(result.every((r) => r.sku === 'TEST-SKU-001')).toBe(true);
        expect(prismaMock.reservation.findMany).toHaveBeenCalledWith({
            where: { sku: 'TEST-SKU-001' },
        });
    });

    it('should delete reservation', async () => {
        (prismaMock.reservation.delete as jest.Mock).mockResolvedValue(
            mockReservation
        );
        (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValue(
            null
        );

        await prismaMock.reservation.delete({
            where: { id: 1 },
        });

        const result = await prismaMock.reservation.findUnique({
            where: { id: 1 },
        });

        expect(result).toBeNull();
        expect(prismaMock.reservation.delete).toHaveBeenCalledWith({
            where: { id: 1 },
        });
    });
});
