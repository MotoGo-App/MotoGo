export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { message: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return NextResponse.json(
      { message: 'Error al obtener el perfil' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const {
      age,
      drivingExperienceYears,
      mototaxiNumber,
      bio,
      profilePhotoUrl,
      vehicleModel,
      licenseNumber,
      vehiclePlate,
      name,
    } = await request.json();

    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
    });

    if (!driver) {
      return NextResponse.json(
        { message: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    // Validar unicidad de licencia si se cambia
    if (licenseNumber && licenseNumber !== driver.licenseNumber) {
      const existingLicense = await prisma.driver.findFirst({
        where: { licenseNumber, id: { not: driver.id } },
      });
      if (existingLicense) {
        return NextResponse.json(
          { message: 'Ese número de licencia ya está registrado' },
          { status: 409 }
        );
      }
    }

    // Validar unicidad de placa si se cambia
    if (vehiclePlate && vehiclePlate !== driver.vehiclePlate) {
      const existingPlate = await prisma.driver.findFirst({
        where: { vehiclePlate, id: { not: driver.id } },
      });
      if (existingPlate) {
        return NextResponse.json(
          { message: 'Esa placa ya está registrada' },
          { status: 409 }
        );
      }
    }

    // Actualizar nombre del usuario si se proporcionó
    if (name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name },
      });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        ...(age !== undefined && { age }),
        ...(drivingExperienceYears !== undefined && { drivingExperienceYears }),
        ...(mototaxiNumber !== undefined && { mototaxiNumber }),
        ...(bio !== undefined && { bio }),
        ...(profilePhotoUrl !== undefined && { profilePhotoUrl }),
        ...(vehicleModel !== undefined && { vehicleModel }),
        ...(licenseNumber && { licenseNumber }),
        ...(vehiclePlate && { vehiclePlate }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error('Error updating driver profile:', error);
    return NextResponse.json(
      { message: 'Error al actualizar el perfil' },
      { status: 500 }
    );
  }
}
