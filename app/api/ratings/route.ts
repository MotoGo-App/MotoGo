import {validateBody} from "@/lib/http";

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';
import { ratingSchema} from "./schema";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
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
      return NextResponse.json(
        { message: 'Ya has calificado este viaje' },
        { status: 409 }
      );
    }

    const rating = await withRetry(() =>
      prisma.rating.create({
        data: {
          rideId,
          fromUserId: session.user!.id,
          toUserId,
          stars,
          comment,
          isClientRating,
        },
      })
    );

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
    return NextResponse.json(
      { message: 'Error al crear la calificación' },
      { status: 500 }
    );
  }
}
