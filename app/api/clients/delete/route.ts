export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminUser = await withRetry(() =>
      prisma.user.findUnique({ where: { id: session.user!.id } })
    );

    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { clientId } = await request.json();
    if (!clientId) {
      return NextResponse.json({ error: 'clientId requerido' }, { status: 400 });
    }

    const client = await withRetry(() =>
      prisma.user.findUnique({ where: { id: clientId } })
    );

    if (!client || client.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Delete in the correct order to respect foreign keys
    // 1. Delete messages sent by this client
    await withRetry(() =>
      prisma.message.deleteMany({ where: { senderId: clientId } })
    );

    // 2. Delete ratings related to this client
    await withRetry(() =>
      prisma.rating.deleteMany({
        where: {
          OR: [
            { toUserId: clientId },
            { fromUserId: clientId },
          ],
        },
      })
    );

    // 3. Delete payments by this client
    await withRetry(() =>
      prisma.payment.deleteMany({ where: { userId: clientId } })
    );

    // 4. Delete messages from rides of this client (sent by drivers)
    const clientRides = await withRetry(() =>
      prisma.ride.findMany({ where: { clientId }, select: { id: true } })
    );
    if (clientRides.length > 0) {
      await withRetry(() =>
        prisma.message.deleteMany({
          where: { rideId: { in: clientRides.map((r) => r.id) } },
        })
      );
    }

    // 5. Delete rides of this client
    await withRetry(() =>
      prisma.ride.deleteMany({ where: { clientId } })
    );

    // 6. Delete NextAuth sessions and accounts
    await withRetry(() =>
      prisma.session.deleteMany({ where: { userId: clientId } })
    );
    await withRetry(() =>
      prisma.account.deleteMany({ where: { userId: clientId } })
    );

    // 7. Delete password reset tokens
    await withRetry(() =>
      prisma.passwordResetToken.deleteMany({ where: { userId: clientId } })
    );

    // 8. Delete the user
    await withRetry(() =>
      prisma.user.delete({ where: { id: clientId } })
    );

    return NextResponse.json({
      message: 'Cliente eliminado exitosamente',
      clientId,
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    );
  }
}
