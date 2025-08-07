import { z } from 'zod'

export const createGoalSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  target: z.number().positive(),
  targetDate: z.string().datetime(),
})
