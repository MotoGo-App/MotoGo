export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const ride = await prisma.ride.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      driver: true,
      payment: true,
      ratings: true,
    },
  });

  if (!ride) {
    return NextResponse.json({ message: 'Viaje no encontrado' }, { status: 404 });
  }

  return NextResponse.json(ride);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const data = await request.json();

    const ride = await prisma.ride.update({
      where: { id: params.id },
      data,
      include: {
        client: true,
        driver: true,
        payment: true,
        ratings: true,
      },
    });

    return NextResponse.json(ride);
  } catch (error) {
    console.error('Error updating ride:', error);
    return NextResponse.json(
      { message: 'Error al actualizar el viaje' },
      { status: 500 }
    );
  }
}
