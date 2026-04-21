export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Auto-asignación deshabilitada.
// Los conductores ahora aceptan o rechazan viajes manualmente desde su dashboard.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  // Ya no se asigna automáticamente — los conductores eligen sus viajes
  return NextResponse.json({ assigned: 0, message: 'Los conductores aceptan viajes manualmente' });
}
