import { z } from 'zod'

export const createInsuranceSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(['LIFE', 'DISABILITY']),
  coverage: z.number().positive(),
  premium: z.number().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
})

export const updateInsuranceSchema = createInsuranceSchema.partial()
