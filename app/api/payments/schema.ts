import { z } from 'zod';

export const paymentSchema = z.object({
    rideId: z.string().min(1),
    paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'cash']),
})