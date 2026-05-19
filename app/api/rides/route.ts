export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { calculateHaversineDistance } from '@/lib/geo';
import { ridesSchema } from './schema';
import { validateBody } from '@/lib/http';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: session.user!.id },
      })
    );

    let rides;

    if (user?.role === 'CLIENT') {
      // Auto-cleanup: fix ghost rides (ACCEPTED but no driver) older than 30 seconds
      await withRetry(() =>
        prisma.ride.updateMany({
          where: {
            clientId: session.user!.id,
            status: 'ACCEPTED',
            driverId: null,
          },
          data: { status: 'REQUESTED' },
        })
      ).catch(() => {});

      rides = await withRetry(() =>
        prisma.ride.findMany({
          where: { clientId: session.user!.id },
          include: {
            client: true,
            driver: {
              include: {
                driverProfile: {
                  include: {
                    location: true,
                  },
                },
              },
            },
            payment: true,
            ratings: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );
    } else if (user?.role === 'DRIVER') {
      const driverLocation = await withRetry(() =>
        prisma.driverLocation.findFirst({
          where: {
            driver: { userId: session.user!.id },
          },
        })
      );

      const myRides = await withRetry(() =>
        prisma.ride.findMany({
          where: { driverId: session.user!.id },
          include: {
            client: true,
            driver: true,
            payment: true,
            ratings: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      );

      const MAX_RADIUS_KM = 10;
      let availableRides: typeof myRides = [];

      if (driverLocation) {
        const requestedRides = await withRetry(() =>
          prisma.ride.findMany({
            where: {
              status: 'REQUESTED',
              driverId: null,
              originLatitude: { not: null },
              originLongitude: { not: null },
            },
            include: {
              client: true,
              driver: true,
              payment: true,
              ratings: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        );

        availableRides = requestedRides.filter((ride) => {
          if (!ride.originLatitude || !ride.originLongitude) return false;
          const dist = calculateHaversineDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            ride.originLatitude,
            ride.originLongitude
          );
          return dist <= MAX_RADIUS_KM;
        });
      }

      rides = [...myRides, ...availableRides];
    } else if (user?.role === 'ADMIN') {
      rides = await withRetry(() =>
        prisma.ride.findMany({
          include: {
            client: true,
            driver: true,
            payment: true,
            ratings: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })
      );
    }

    return NextResponse.json(rides ?? []);
  } catch (error) {
    console.error('Error fetching rides:', error);
    return NextResponse.json({ message: 'Error al obtener viajes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, ridesSchema);
    if (!validation.ok) return validation.response;
    const {
      originAddress,
      originLatitude,
      originLongitude,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
    } = validation.data;

    const distance = calculateHaversineDistance(
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude
    );

    const ride = await withRetry(() =>
      prisma.ride.create({
        data: {
          clientId: session.user!.id,
          originAddress,
          originLatitude,
          originLongitude,
          destinationAddress,
          destinationLatitude,
          destinationLongitude,
          fare: 0,
          estimatedDuration: Math.ceil(distance * 2),
          status: 'REQUESTED',
        },
        include: {
          client: true,
          driver: true,
          payment: true,
        },
      })
    );

    return NextResponse.json(ride, { status: 201 });
  } catch (error) {
    console.error('Error creating ride:', error);
    return NextResponse.json({ message: 'Error al crear el viaje' }, { status: 500 });
  }
}
