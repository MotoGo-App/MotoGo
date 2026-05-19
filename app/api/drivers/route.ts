export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { calculateHaversineDistance } from '@/lib/geo';

const MAX_DISTANCE_KM = 10;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    const drivers = await withRetry(() =>
      prisma.driver.findMany({
        include: {
          user: true,
          location: true,
          subscription: true,
        },
        where: {
          status: 'online',
        },
      })
    );

    if (!isNaN(lat) && !isNaN(lng)) {
      const nearbyDrivers = drivers.filter((driver) => {
        if (!driver.location) return false;
        const dist = calculateHaversineDistance(
          lat,
          lng,
          driver.location.latitude,
          driver.location.longitude
        );
        return dist <= MAX_DISTANCE_KM;
      });
      return NextResponse.json(nearbyDrivers);
    }

    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ message: 'Error al obtener conductores' }, { status: 500 });
  }
}
