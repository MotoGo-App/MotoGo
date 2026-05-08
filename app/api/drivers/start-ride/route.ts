export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { startRideSchema } from './schema';
import { validateBody } from '@/lib/http';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, startRideSchema);
    if (!validation.ok) return validation.response;
    const { rideId } = validation.data;

    // Verify ride exists, belongs to this driver, and is ACCEPTED
    const existingRide = await withRetry(() => prisma.ride.findUnique({ where: { id: rideId } }));

    if (!existingRide) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (existingRide.driverId !== session.user.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    if (existingRide.status !== 'ACCEPTED') {
      return NextResponse.json(
        { message: 'El viaje debe estar en estado "Aceptado" para iniciarlo' },
        { status: 400 }
      );
    }

    const ride = await withRetry(() =>
      prisma.ride.update({
        where: { id: rideId },
        data: {
          status: 'IN_PROGRESS',
          startTime: new Date(),
        },
        include: {
          client: true,
          driver: true,
        },
      })
    );

    return NextResponse.json(ride);
  } catch (error) {
    console.error('Error starting ride:', error);
    return NextResponse.json({ message: 'Error al iniciar el viaje' }, { status: 500 });
  }
}
