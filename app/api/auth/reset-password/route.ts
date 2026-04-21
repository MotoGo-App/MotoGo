export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    // Find valid token
    const resetToken = await withRetry(async () => {
      return prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true },
      });
    });

    if (!resetToken) {
      return NextResponse.json({ message: 'Enlace inválido o expirado' }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ message: 'Este enlace ya fue utilizado' }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ message: 'El enlace ha expirado. Solicita uno nuevo.' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await withRetry(async () => {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ]);
    });

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error in reset-password:', error);
    return NextResponse.json({ message: 'Error al restablecer la contraseña' }, { status: 500 });
  }
}
