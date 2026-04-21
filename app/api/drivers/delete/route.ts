import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Get driver ID from request body
    const { driverId } = await request.json();
    if (!driverId) {
      return NextResponse.json({ error: 'driverId requerido' }, { status: 400 });
    }

    // Find the driver
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 });
    }

    // Delete in the correct order to respect foreign keys
    // 1. Delete all ratings related to this driver
    await prisma.rating.deleteMany({
      where: {
        OR: [
          { toUserId: driver.userId },
          { fromUserId: driver.userId },
        ],
      },
    });

    // 2. Delete all rides where this driver is involved
    await prisma.ride.deleteMany({
      where: {
        OR: [
          { driverId: driverId },
          { clientId: driver.userId },
        ],
      },
    });

    // 3. Delete payments
    await prisma.payment.deleteMany({
      where: { userId: driver.userId },
    });

    // 4. Delete driver location
    await prisma.driverLocation.deleteMany({
      where: { driverId: driverId },
    });

    // 5. Delete subscription
    await prisma.subscription.deleteMany({
      where: { driverId: driverId },
    });

    // 6. Delete driver profile
    await prisma.driver.delete({
      where: { id: driverId },
    });

    // 7. Delete NextAuth sessions and accounts
    await prisma.session.deleteMany({
      where: { userId: driver.userId },
    });

    await prisma.account.deleteMany({
      where: { userId: driver.userId },
    });

    // 8. Delete the user
    await prisma.user.delete({
      where: { id: driver.userId },
    });

    return NextResponse.json({
      message: 'Conductor eliminado exitosamente',
      driverId,
    });
  } catch (error) {
    console.error('Error al eliminar conductor:', error);
    return NextResponse.json(
      { error: 'Error al eliminar conductor' },
      { status: 500 }
    );
  }
}
