export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { rideId } = await request.json();
    if (!rideId) {
      return NextResponse.json({ message: 'ID de viaje requerido' }, { status: 400 });
    }

    // Fetch the ride to verify ownership and status
    const ride = await withRetry(() =>
      prisma.ride.findUnique({ where: { id: rideId } })
    );

    if (!ride) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (ride.clientId !== (session.user as any).id) {
      return NextResponse.json({ message: 'No autorizado para cancelar este viaje' }, { status: 403 });
    }

    // Allow cancel if REQUESTED, or if ACCEPTED but no driver assigned (ghost ride)
    const canCancel = ride.status === 'REQUESTED' || 
                      (ride.status === 'ACCEPTED' && !ride.driverId);
    if (!canCancel) {
      return NextResponse.json(
        { message: 'Solo se pueden cancelar viajes que aún no han sido aceptados por un conductor' },
        { status: 400 }
      );
    }

    const updatedRide = await withRetry(() =>
      prisma.ride.update({
        where: { id: rideId },
        data: { status: 'CANCELED' },
      })
    );

    return NextResponse.json(updatedRide);
  } catch (error) {
    console.error('Error canceling ride:', error);
    return NextResponse.json(
      { message: 'Error al cancelar el viaje' },
      { status: 500 }
    );
  }
}
