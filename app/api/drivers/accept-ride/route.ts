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

    // Verificar que el conductor está online
    const driver = await withRetry(() =>
      prisma.driver.findUnique({
        where: { userId: session.user!.id },
      })
    );
    if (!driver || driver.status !== 'online') {
      return NextResponse.json(
        { message: 'Debes estar en línea para aceptar viajes' },
        { status: 403 }
      );
    }

    // Verify ride exists and is still REQUESTED
    const existingRide = await withRetry(() =>
      prisma.ride.findUnique({ where: { id: rideId } })
    );
    if (!existingRide || existingRide.status !== 'REQUESTED') {
      return NextResponse.json(
        { message: 'Este viaje ya no está disponible' },
        { status: 400 }
      );
    }

    const ride = await withRetry(() =>
      prisma.ride.update({
        where: { id: rideId },
        data: {
          driverId: session.user!.id,
          status: 'ACCEPTED',
        },
        include: {
          client: true,
          driver: true,
        },
      })
    );

    return NextResponse.json(ride);
  } catch (error) {
    console.error('Error accepting ride:', error);
    return NextResponse.json(
      { message: 'Error al aceptar el viaje' },
      { status: 500 }
    );
  }
}
