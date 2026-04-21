import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

// Forzar ejecución dinámica para evitar que Next.js o el navegador sirvan respuestas cacheadas
// cuando el driver acaba de actualizar su perfil (isProfileComplete cambia de false → true).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: session.user!.id },
        include: {
          driverProfile: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    // Check if driver profile is complete (not using temp/placeholder values)
    let isProfileComplete = true;
    if (user.role === 'DRIVER' && user.driverProfile) {
      const d = user.driverProfile;
      isProfileComplete = !!(
        d.licenseNumber &&
        !d.licenseNumber.startsWith('TEMP-') &&
        d.vehiclePlate &&
        !d.vehiclePlate.startsWith('TEMP-') &&
        d.vehicleModel &&
        d.vehicleModel !== 'Por configurar'
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isProfileComplete,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 });
  }
}
