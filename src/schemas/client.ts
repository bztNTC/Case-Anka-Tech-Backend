import { z } from 'zod'

export const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive(),
  status: z.boolean(),
  familyType: z.string().min(1),
})

export const updateClientSchema = createClientSchema.partial()
