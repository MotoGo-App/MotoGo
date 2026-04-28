import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma, RideStatus } from '@prisma/client';
import type { NextRequest } from 'next/server';

const { mockGetServerSession, mockPrisma } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockPrisma: {
    driver: { findUnique: vi.fn() },
    ride: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
  withRetry: <T,>(fn: () => Promise<T>): Promise<T> => fn(),
}));

const { POST } = await import('@/app/api/drivers/accept-ride/route');

const DRIVER_ID = 'driver-123';
const RIDE_ID = 'ride-456';
const CLIENT_ID = 'client-789';

const onlineDriver = { userId: DRIVER_ID, status: 'online' };

const requestedRide = {
  id: RIDE_ID,
  clientId: CLIENT_ID,
  driverId: null,
  status: RideStatus.REQUESTED,
};

const acceptedRideWithRelations = {
  ...requestedRide,
  driverId: DRIVER_ID,
  status: RideStatus.ACCEPTED,
  client: { id: CLIENT_ID, name: 'Cliente' },
  driver: { id: DRIVER_ID, name: 'Conductor' },
};

const sessionFor = (id: string) => ({ user: { id } });

const makeRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/drivers/accept-ride', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  // The transaction runs the callback synchronously against the same mock client,
  // so any tx.* call hits the same vi.fn() that we configure on mockPrisma.*.
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)
  );
});

describe('POST /api/drivers/accept-ride', () => {
  describe('authentication', () => {
    it('returns 401 when there is no session', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ message: 'No autenticado' });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns 401 when the session is missing user.id', async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: {} });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(401);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
    });

    it('returns 400 when rideId is missing from the body', async () => {
      const response = await POST(makeRequest({}));

      expect(response.status).toBe(400);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns 400 when rideId is an empty string', async () => {
      const response = await POST(makeRequest({ rideId: '' }));

      expect(response.status).toBe(400);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns 400 when the body is not valid JSON', async () => {
      const req = new Request(
        'http://localhost/api/drivers/accept-ride',
        {
          method: 'POST',
          body: 'not-json{',
          headers: { 'Content-Type': 'application/json' },
        }
      ) as unknown as NextRequest;

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('driver state', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
    });

    it('returns 403 when the driver record does not exist', async () => {
      mockPrisma.driver.findUnique.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        message: 'Debes estar en línea para aceptar viajes',
      });
      expect(mockPrisma.ride.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.ride.update).not.toHaveBeenCalled();
    });

    it('returns 403 when the driver is offline', async () => {
      mockPrisma.driver.findUnique.mockResolvedValueOnce({
        ...onlineDriver,
        status: 'offline',
      });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(403);
      expect(mockPrisma.ride.findUnique).not.toHaveBeenCalled();
    });

    it('returns 403 when the driver is busy on another ride', async () => {
      mockPrisma.driver.findUnique.mockResolvedValueOnce({
        ...onlineDriver,
        status: 'busy',
      });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(403);
    });
  });

  describe('ride state', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
      mockPrisma.driver.findUnique.mockResolvedValue(onlineDriver);
    });

    it('returns 404 when the ride does not exist', async () => {
      mockPrisma.ride.findUnique.mockResolvedValueOnce(null);

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ message: 'Viaje no encontrado' });
      expect(mockPrisma.ride.update).not.toHaveBeenCalled();
    });

    it('returns 409 when the ride was already accepted by someone else', async () => {
      mockPrisma.ride.findUnique.mockResolvedValueOnce({
        ...requestedRide,
        status: RideStatus.ACCEPTED,
      });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        message: 'Este viaje ya fue aceptado',
      });
      expect(mockPrisma.ride.update).not.toHaveBeenCalled();
    });

    it('returns 409 when the ride is in a terminal state (COMPLETED)', async () => {
      mockPrisma.ride.findUnique.mockResolvedValueOnce({
        ...requestedRide,
        status: RideStatus.COMPLETED,
      });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(409);
      expect(mockPrisma.ride.update).not.toHaveBeenCalled();
    });

    it('returns 409 when the ride was canceled', async () => {
      mockPrisma.ride.findUnique.mockResolvedValueOnce({
        ...requestedRide,
        status: RideStatus.CANCELED,
      });

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(409);
    });
  });

  describe('race condition (P2025)', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
      mockPrisma.driver.findUnique.mockResolvedValue(onlineDriver);
      mockPrisma.ride.findUnique.mockResolvedValue(requestedRide);
    });

    it('returns 409 when another driver wins the race and the update returns P2025', async () => {
      const p2025 = new Prisma.PrismaClientKnownRequestError(
        'Record to update not found',
        { code: 'P2025', clientVersion: '6.7.0' }
      );
      mockPrisma.ride.update.mockRejectedValueOnce(p2025);

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        message: 'Este viaje ya fue aceptado',
      });
    });

    it('does not swallow non-P2025 known errors as ALREADY_TAKEN', async () => {
      const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '6.7.0' }
      );
      mockPrisma.ride.update.mockRejectedValueOnce(otherPrismaError);

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: 'Error al aceptar el viaje',
      });
    });
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
      mockPrisma.driver.findUnique.mockResolvedValue(onlineDriver);
      mockPrisma.ride.findUnique.mockResolvedValue(requestedRide);
      mockPrisma.ride.update.mockResolvedValue(acceptedRideWithRelations);
    });

    it('returns 200 with the updated ride and its related client + driver', async () => {
      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(acceptedRideWithRelations);
    });

    it('issues an UPDATE guarded by status=REQUESTED so concurrent accepts cannot both win', async () => {
      await POST(makeRequest({ rideId: RIDE_ID }));

      expect(mockPrisma.ride.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.ride.update).toHaveBeenCalledWith({
        where: { id: RIDE_ID, status: RideStatus.REQUESTED },
        data: { driverId: DRIVER_ID, status: RideStatus.ACCEPTED },
        include: { client: true, driver: true },
      });
    });

    it('runs the entire driver+ride flow inside a single $transaction', async () => {
      await POST(makeRequest({ rideId: RIDE_ID }));

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('looks up the driver by the authenticated user id, not by anything from the request body', async () => {
      await POST(makeRequest({ rideId: RIDE_ID, driverId: 'attacker' }));

      expect(mockPrisma.driver.findUnique).toHaveBeenCalledWith({
        where: { userId: DRIVER_ID },
      });
    });
  });

  describe('unexpected errors', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(sessionFor(DRIVER_ID));
    });

    it('returns 500 when the driver lookup throws an unknown error', async () => {
      mockPrisma.driver.findUnique.mockRejectedValueOnce(new Error('boom'));

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: 'Error al aceptar el viaje',
      });
    });

    it('returns 500 when the ride lookup throws an unknown error', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(onlineDriver);
      mockPrisma.ride.findUnique.mockRejectedValueOnce(new Error('db down'));

      const response = await POST(makeRequest({ rideId: RIDE_ID }));

      expect(response.status).toBe(500);
    });
  });
});
