export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

// GET: Fetch messages for a ride
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rideId = searchParams.get('rideId');

    if (!rideId) {
      return NextResponse.json({ message: 'rideId requerido' }, { status: 400 });
    }

    // Verify user is part of this ride
    const ride = await withRetry(() =>
      prisma.ride.findUnique({ where: { id: rideId } })
    );

    if (!ride) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (ride.clientId !== session.user.id && ride.driverId !== session.user.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    const messages = await withRetry(() =>
      prisma.message.findMany({
        where: { rideId },
        include: {
          sender: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      })
    );

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { message: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

// POST: Send a message
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { rideId, content } = await request.json();

    if (!rideId || !content?.trim()) {
      return NextResponse.json({ message: 'rideId y contenido requeridos' }, { status: 400 });
    }

    // Verify user is part of this ride
    const ride = await withRetry(() =>
      prisma.ride.findUnique({ where: { id: rideId } })
    );

    if (!ride) {
      return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
    }

    if (ride.clientId !== session.user.id && ride.driverId !== session.user.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    // Only allow messages for active rides
    if (!['ACCEPTED', 'IN_PROGRESS'].includes(ride.status)) {
      return NextResponse.json(
        { message: 'Solo se pueden enviar mensajes durante un viaje activo' },
        { status: 400 }
      );
    }

    const message = await withRetry(() =>
      prisma.message.create({
        data: {
          rideId,
          senderId: session.user!.id,
          content: content.trim(),
        },
        include: {
          sender: {
            select: { id: true, name: true, role: true },
          },
        },
      })
    );

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { message: 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
