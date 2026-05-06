import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { validateBody } from '@/lib/http';
import { ratingSchema } from './schema';
// S2.4 - Importamos las utilidades de seguridad
import { calculateThrottlingDelay, sleep } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. S2.4 - Throttling: Consultar cuántas veces ha calificado este usuario recientemente (últimos 5 min)
    const recentRatingsCount = await prisma.authAttempt.count({
      where: {
        identifier: userId,
        endpoint: 'rating',
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });

    // 2. S2.4 - Aplicar el freno si hay actividad excesiva
    const delay = calculateThrottlingDelay(recentRatingsCount);
    if (delay > 0) {
      await sleep(delay);
    }

    const validation = await validateBody(request, ratingSchema);

    if (!validation.ok) {
      return validation.response;
    }

    const { rideId, toUserId, stars, comment, isClientRating } = validation.data;

    const existingRating = await withRetry(() =>
      prisma.rating.findFirst({
        where: {
          rideId,
          isClientRating,
        },
      })
    );

    if (existingRating) {
      return NextResponse.json({ message: 'Ya has calificado este viaje' }, { status: 409 });
    }

    const rating = await withRetry(() =>
      prisma.rating.create({
        data: {
          rideId,
          fromUserId: userId,
          toUserId,
          stars,
          comment,
          isClientRating,
        },
      })
    );

    // 3. S2.4 - Registro de éxito en la auditoría
    await prisma.authAttempt.create({
      data: { identifier: userId, endpoint: 'rating', success: true },
    });

    // Update driver rating if client is rating driver
    if (isClientRating) {
      const ride = await withRetry(() =>
        prisma.ride.findUnique({
          where: { id: rideId },
          include: { driver: { include: { driverProfile: true } } },
        })
      );

      if (ride?.driverId) {
        const allRatings = await withRetry(() =>
          prisma.rating.findMany({
            where: {
              toUserId: ride.driverId!,
              isClientRating: true,
            },
          })
        );

        const averageRating =
          allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length || 0;

        await withRetry(() =>
          prisma.driver.update({
            where: { userId: ride.driverId! },
            data: { averageRating },
          })
        );
      }
    }

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error('Error creating rating:', error);

    // S2.4 - Registro de fallo en la auditoría
    await prisma.authAttempt.create({
      data: { identifier: userId, endpoint: 'rating', success: false },
    });

    return NextResponse.json({ message: 'Error al crear la calificación' }, { status: 500 });
  }
}
