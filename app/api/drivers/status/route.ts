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
    const { isOnline } = await request.json();

    const driver = await withRetry(() =>
      prisma.driver.findUnique({
        where: { userId: session.user!.id },
      })
    );

    if (!driver) {
      return NextResponse.json(
        { message: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    const updatedDriver = await withRetry(() =>
      prisma.driver.update({
        where: { id: driver.id },
        data: {
          status: isOnline ? 'online' : 'offline',
        },
      })
    );

    return NextResponse.json({
      status: updatedDriver.status,
      isOnline: updatedDriver.status === 'online',
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { message: 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const driver = await withRetry(() =>
      prisma.driver.findUnique({
        where: { userId: session.user!.id },
      })
    );

    if (!driver) {
      return NextResponse.json(
        { message: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: driver.status,
      isOnline: driver.status === 'online',
    });
  } catch (error) {
    console.error('Error fetching driver status:', error);
    return NextResponse.json(
      { message: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
