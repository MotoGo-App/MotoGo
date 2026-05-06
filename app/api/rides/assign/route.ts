export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignRideSchema } from './schema';
import { handleValidationError } from '@/lib/utils';

// Auto-asignación deshabilitada.
// Los conductores ahora aceptan o rechazan viajes manualmente desde su dashboard.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const result = assignRideSchema.safeParse(body);
  if (!result.success) {
    return handleValidationError(result);
  }

  // Ya no se asigna automáticamente — los conductores eligen sus viajes
  return NextResponse.json({ assigned: 0, message: 'Los conductores aceptan viajes manualmente' });
}
