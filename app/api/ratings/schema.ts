import {z} from "zod";

export const ratingSchema = z.object({
    rideId: z.string().min(1),
    toUserId: z.string().min(1),
    stars: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
    isClientRating: z.boolean(),
})
