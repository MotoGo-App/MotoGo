import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma, RideStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { acceptRideSchema } from './schema';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const driverId = session?.user?.id;

  if (!driverId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const result = acceptRideSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
  }
  const { rideId } = result.data;

  try {
    const accepted = await prisma.$transaction(async (tx) => {
      const driver = await withRetry(() => tx.driver.findUnique({ where: { userId: driverId } }));

      if (!driver || driver.status !== 'online') {
        return { ok: false as const, reason: 'DRIVER_OFFLINE' as const };
      }

      const ride = await tx.ride.findUnique({ where: { id: rideId } });

      if (!ride) {
        return { ok: false as const, reason: 'NOT_FOUND' as const };
      }

      if (ride.status !== RideStatus.REQUESTED) {
        return { ok: false as const, reason: 'ALREADY_TAKEN' as const };
      }

      try {
        const updated = await tx.ride.update({
          where: { id: rideId, status: RideStatus.REQUESTED },
          data: { driverId, status: RideStatus.ACCEPTED },
          include: { client: true, driver: true },
        });

        return { ok: true as const, ride: updated };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
          return { ok: false as const, reason: 'ALREADY_TAKEN' as const };
        }
        throw e;
      }
    });

    if (!accepted.ok) {
      if (accepted.reason === 'NOT_FOUND') {
        return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
      }
      if (accepted.reason === 'DRIVER_OFFLINE') {
        return NextResponse.json(
          { message: 'Debes estar en línea para aceptar viajes' },
          { status: 403 }
        );
      }
      return NextResponse.json({ message: 'Este viaje ya fue aceptado' }, { status: 409 });
    }

    return NextResponse.json(accepted.ride, { status: 200 });
  } catch (error) {
    console.error('Error accepting ride:', error);
    return NextResponse.json({ message: 'Error al aceptar el viaje' }, { status: 500 });
  }
}
