import {z} from "zod";


export const acceptRideSchema = z.object({
    rideId: z.string(),
})