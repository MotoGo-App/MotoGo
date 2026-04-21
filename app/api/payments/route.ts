export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, withRetry } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const payments = await withRetry(() =>
      prisma.payment.findMany({
        where: { userId: session.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    );

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { message: 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { rideId, amount, type } = await request.json();

    let paymentIntent: any = null;
    let stripePaymentIntentId: string | undefined = undefined;

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'mxn',
        metadata: {
          rideId,
          userId: session.user.id,
          type,
        },
      });
      stripePaymentIntentId = paymentIntent.id;
    }

    const payment = await withRetry(() =>
      prisma.payment.create({
        data: {
          userId: session.user!.id,
          rideId: rideId || null,
          amount,
          currency: 'MXN',
          type,
          status: 'PENDING',
          stripePaymentIntentId: stripePaymentIntentId,
          metadata: JSON.stringify({
            origin: request.headers.get('origin'),
          }),
        },
      })
    );

    return NextResponse.json({
      payment,
      clientSecret: paymentIntent?.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { message: 'Error al crear el pago' },
      { status: 500 }
    );
  }
}
