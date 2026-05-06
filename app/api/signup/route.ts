import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { prisma, withRetry } from '@/lib/db';
// Importamos las utilidades para el Throttling
import { calculateThrottlingDelay, sleep } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const identifier = email.toLowerCase().trim();

    // 1. S2.4 - Consultar intentos de registro recientes (últimos 15 min)
    const recentFailures = await prisma.authAttempt.count({
      where: {
        identifier,
        endpoint: 'signup',
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    // 2. S2.4 - Aplicar retraso progresivo si se detecta actividad sospechosa
    const delay = calculateThrottlingDelay(recentFailures);
    if (delay > 0) {
      await sleep(delay);
    }

    const existingUser = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: identifier },
      })
    );

    if (existingUser) {
      // S2.4 - Registramos el intento fallido porque el usuario ya existe
      await prisma.authAttempt.create({
        data: { identifier, endpoint: 'signup', success: false },
      });
      return NextResponse.json({ message: 'El usuario ya existe' }, { status: 409 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await withRetry(() =>
      prisma.user.create({
        data: {
          email: identifier,
          password: hashedPassword,
          name,
          role: role || 'CLIENT',
        },
      })
    );

    // If DRIVER role, create driver profile and free subscription
    if (user.role === 'DRIVER') {
      const uniqueSuffix = `${user.id.slice(0, 8)}-${Date.now()}`;
      const driver = await prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: `TEMP-LIC-${uniqueSuffix}`,
          vehicleModel: 'Por configurar',
          vehiclePlate: `TEMP-PLT-${uniqueSuffix}`,
        },
      });

      await prisma.subscription.create({
        data: {
          driverId: driver.id,
          status: 'ACTIVE',
          monthlyFee: 0,
          currency: 'MXN',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // If ADMIN role, create admin profile
    if (user.role === 'ADMIN') {
      await prisma.admin.create({
        data: {
          userId: user.id,
        },
      });
    }

    // 3. S2.4 - Registro de éxito en la creación de cuenta
    await prisma.authAttempt.create({
      data: { identifier, endpoint: 'signup', success: true },
    });

    return NextResponse.json({ message: 'Usuario creado exitosamente' }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    // S2.4 - Registro de error técnico como intento fallido
    const { email } = await request
      .clone()
      .json()
      .catch(() => ({ email: 'unknown' }));
    await prisma.authAttempt.create({
      data: { identifier: email.toLowerCase(), endpoint: 'signup', success: false },
    });

    return NextResponse.json({ message: 'Error al crear el usuario' }, { status: 500 });
  }
}
