export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }

  try {
    const { paymentIntentId } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { message: 'Stripe no configurado' },
        { status: 503 }
      );
    }

    // Retrieve payment intent from Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Update payment record - use findFirst since it's not the unique key
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      return NextResponse.json({ message: 'Pago no encontrado' }, { status: 404 });
    }

    if (paymentIntent.status === 'succeeded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          stripeChargeId: paymentIntent.charges?.data?.[0]?.id,
        },
      });

      // If ride payment, update ride status
      if (payment.rideId) {
        await prisma.ride.update({
          where: { id: payment.rideId },
          data: { status: 'ACCEPTED' },
        });
      }
    }

    return NextResponse.json({ status: paymentIntent.status });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { message: 'Error al confirmar el pago' },
      { status: 500 }
    );
  }
}
