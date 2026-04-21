export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { rideId } = await request.json();

    // Verify ride is IN_PROGRESS before completing
    const existingRide = await withRetry(() =>
      prisma.ride.findUnique({ where: { id: rideId } })
    );

    if (!existingRide) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (existingRide.driverId !== session.user.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    if (existingRide.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { message: 'El viaje debe estar en curso para finalizarlo' },
        { status: 400 }
      );
    }

    const ride = await withRetry(() =>
      prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'COMPLETED',
          completionTime: new Date(),
        },
        include: {
          client: true,
          driver: true,
        },
      })
    );

    // Update driver statistics
    const driver = await withRetry(() =>
      prisma.driver.findUnique({
        where: { userId: session.user!.id },
      })
    );

    if (driver) {
      await withRetry(() =>
        prisma.driver.update({
          where: { id: driver.id },
          data: {
            totalRides: driver.totalRides + 1,
          },
        })
      );
    }

    return NextResponse.json(ride);
  } catch (error) {
    console.error('Error completing ride:', error);
    return NextResponse.json(
      { message: 'Error al completar el viaje' },
      { status: 500 }
    );
  }
}
