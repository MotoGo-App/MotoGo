export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

// GET: Fetch a driver's current location by driverId (query param)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json({ message: 'driverId requerido' }, { status: 400 });
    }

    const location = await withRetry(async () => {
      // Ride.driverId references User.id, so look up Driver by userId
      const driver = await prisma.driver.findUnique({
        where: { userId: driverId },
        include: { location: true },
      });

      if (!driver?.location) {
        return null;
      }

      return {
        latitude: driver.location.latitude,
        longitude: driver.location.longitude,
        speed: driver.location.speed,
        heading: driver.location.heading,
        accuracy: driver.location.accuracy,
        updatedAt: driver.location.updatedAt,
      };
    });

    if (!location) {
      return NextResponse.json({ message: 'Ubicación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error fetching driver location:', error);
    return NextResponse.json(
      { message: 'Error al obtener ubicación' },
      { status: 500 }
    );
  }
}

// POST: Update the driver's current location
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { latitude, longitude, accuracy, speed, heading } = await request.json();

    const location = await withRetry(async () => {
      const driver = await prisma.driver.findUnique({
        where: { userId: session.user!.id },
      });

      if (!driver) {
        return null;
      }

      return prisma.driverLocation.upsert({
        where: { driverId: driver.id },
        update: {
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
        },
        create: {
          driverId: driver.id,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
        },
      });
    });

    if (!location) {
      return NextResponse.json(
        { message: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { message: 'Error al actualizar ubicación' },
      { status: 500 }
    );
  }
}