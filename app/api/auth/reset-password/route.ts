export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { resetPasswordSchema } from './schema';
import bcrypt from 'bcryptjs';
import { handleValidationError } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return handleValidationError(result);
    }

    const { token, newPassword, email } = result.data;

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
      return NextResponse.json(
        { message: 'El enlace ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

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
