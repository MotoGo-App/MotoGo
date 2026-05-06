export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import crypto from 'crypto';
import { sendForgotPasswordEmail } from '@/lib/email';
import { calculateThrottlingDelay, sleep } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email requerido' }, { status: 400 });
    }

    const identifier = email.toLowerCase().trim();

    // 1. Throttling
    const recentFailures = await prisma.authAttempt.count({
      where: {
        identifier,
        endpoint: 'forgot-password',
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
    });

    const delay = calculateThrottlingDelay(recentFailures);
    if (delay > 0) {
      await sleep(delay);
    }

    const user = await withRetry(async () => {
      return prisma.user.findUnique({ where: { email: identifier } });
    });

    if (!user) {
      await prisma.authAttempt.create({
        data: { identifier, endpoint: 'forgot-password', success: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await withRetry(async () => {
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
    });

    await withRetry(async () => {
      return prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });
    });

    const appUrl = process.env.NEXTAUTH_URL || 'https://motogo.lat';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1128; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0a1128 0%, #1a2744 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 28px;">MotoGo</h1>
          <p style="color: #94a3b8; margin: 0; font-size: 14px;">Recuperación de contraseña</p>
        </div>
        <div style="padding: 30px;">
          <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">Hola <strong>${user.name}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Recibimos una solicitud para restablecer tu contraseña...</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">Restablecer Contraseña</a>
          </div>
          <p style="color: #3b82f6; font-size: 11px; word-break: break-all;">${resetUrl}</p>
        </div>
      </div>
    `;

    try {
      await sendForgotPasswordEmail(user.email, htmlBody);

      // S2.4 - Registro de éxito ANTES del return
      await prisma.authAttempt.create({
        data: { identifier, endpoint: 'forgot-password', success: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Si el correo existe, recibirás un enlace de recuperación.',
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      await prisma.authAttempt.create({
        data: { identifier, endpoint: 'forgot-password', success: false },
      });
      
      return NextResponse.json(
        { message: 'El servicio de correo no está disponible. Intenta más tarde.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ message: 'Error al procesar la solicitud' }, { status: 500 });
  }
}