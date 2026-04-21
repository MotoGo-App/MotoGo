export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email requerido' }, { status: 400 });
    }

    // Find user by email
    const user = await withRetry(async () => {
      return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await withRetry(async () => {
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
    });

    // Create new token
    await withRetry(async () => {
      return prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });
    });

    // Build reset URL
    const appUrl = process.env.NEXTAUTH_URL || 'https://motogo.lat';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send email
    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1128; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0a1128 0%, #1a2744 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 28px;">MotoGo</h1>
          <p style="color: #94a3b8; margin: 0; font-size: 14px;">Recuperación de contraseña</p>
        </div>
        <div style="padding: 30px;">
          <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6;">Hola <strong>${user.name}</strong>,</p>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">Restablecer Contraseña</a>
          </div>
          <p style="color: #64748b; font-size: 12px; line-height: 1.6;">Si no solicitaste esto, puedes ignorar este correo. El enlace expira en <strong>1 hora</strong>.</p>
          <p style="color: #64748b; font-size: 12px; line-height: 1.6;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
          <p style="color: #3b82f6; font-size: 11px; word-break: break-all;">${resetUrl}</p>
        </div>
        <div style="background: #0d1a33; padding: 20px 30px; text-align: center;">
          <p style="color: #475569; margin: 0; font-size: 12px;">© MotoGo ${new Date().getFullYear()}</p>
        </div>
      </div>
    `;

    try {
      const appName = 'MotoGo';
      const senderDomain = appUrl ? new URL(appUrl).hostname : 'motogo.lat';

      await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_token: process.env.ABACUSAI_API_KEY,
          app_id: process.env.WEB_APP_ID,
          notification_id: process.env.NOTIF_ID_RECUPERACIN_DE_CONTRASEA,
          subject: 'Restablecer contraseña - MotoGo',
          body: htmlBody,
          is_html: true,
          recipient_email: user.email,
          sender_email: `noreply@${senderDomain}`,
          sender_alias: appName,
        }),
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ message: 'Error al procesar la solicitud' }, { status: 500 });
  }
}
