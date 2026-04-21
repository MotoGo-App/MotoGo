export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { calculateDistance } from '@/lib/utils';

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
      ).catch(() => {}); // non-critical, don't fail the request

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
      // Obtener ubicación actual del conductor
      const driverLocation = await withRetry(() =>
        prisma.driverLocation.findFirst({
          where: {
            driver: { userId: session.user!.id },
          },
        })
      );

      // Viajes asignados al conductor (sin filtro de distancia)
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

      // Viajes REQUESTED sin conductor — filtrar por radio de 10km
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

        // Filtrar por distancia usando Haversine
        availableRides = requestedRides.filter((ride) => {
          if (!ride.originLatitude || !ride.originLongitude) return false;
          const dist = calculateDistance(
            driverLocation.latitude,
            driverLocation.longitude,
            ride.originLatitude,
            ride.originLongitude
          );
          return dist <= MAX_RADIUS_KM;
        });
      }

      // Combinar: viajes del conductor + viajes cercanos disponibles
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
    return NextResponse.json(
      { message: 'Error al obtener viajes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const {
      originAddress,
      originLatitude,
      originLongitude,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
    } = await request.json();

    // Calcular distancia solo para estimar la duración del viaje
    // No se calcula tarifa: el conductor acuerda el precio con el cliente en persona
    const distance = calculateDistance(
      originLatitude,
      originLongitude,
      destinationLatitude,
      destinationLongitude
    );

    // Crear viaje sin asignar conductor automáticamente
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
    return NextResponse.json(
      { message: 'Error al crear el viaje' },
      { status: 500 }
    );
  }
}
