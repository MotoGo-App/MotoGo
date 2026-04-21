import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { prisma, withRetry } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const existingUser = await withRetry(() =>
      prisma.user.findUnique({
        where: { email },
      })
    );

    if (existingUser) {
      return NextResponse.json(
        { message: 'El usuario ya existe' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const user = await withRetry(() => prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'CLIENT',
      },
    }));

    // If DRIVER role, create driver profile and free subscription
    if (user.role === 'DRIVER') {
      // Generate unique temporary values to avoid unique constraint violations
      const uniqueSuffix = `${user.id.slice(0, 8)}-${Date.now()}`;
      const driver = await prisma.driver.create({
        data: {
          userId: user.id,
          licenseNumber: `TEMP-LIC-${uniqueSuffix}`,
          vehicleModel: 'Por configurar',
          vehiclePlate: `TEMP-PLT-${uniqueSuffix}`,
        },
      });

      // Create a free active subscription for the driver
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

    return NextResponse.json({ message: 'Usuario creado exitosamente' }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}
