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

    const ride = await withRetry(() =>
      prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          client: true,
          driver: true,
        },
      })
    );

    if (!ride) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (ride.status !== 'REQUESTED') {
      return NextResponse.json(
        { message: 'No puedes rechazar este viaje' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Viaje rechazado exitosamente' });
  } catch (error) {
    console.error('Error rejecting ride:', error);
    return NextResponse.json(
      { message: 'Error al rechazar el viaje' },
      { status: 500 }
    );
  }
}
