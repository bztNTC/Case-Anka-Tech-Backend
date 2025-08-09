import { z } from 'zod'

export const createEventSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  value: z.number().positive(),
  frequency: z.enum(['ONCE', 'MONTHLY', 'ANNUAL']),
  startDate: z.string().datetime(),  // ISO
  endDate: z.string().datetime().optional().nullable(),
})

export const updateEventSchema = createEventSchema.partial()
