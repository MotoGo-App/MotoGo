export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    // If client location provided, filter by 10km radius
    if (!isNaN(lat) && !isNaN(lng)) {
      const nearbyDrivers = drivers.filter((driver) => {
        if (!driver.location) return false;
        const dist = haversineDistance(
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
    return NextResponse.json(
      { message: 'Error al obtener conductores' },
      { status: 500 }
    );
  }
}
