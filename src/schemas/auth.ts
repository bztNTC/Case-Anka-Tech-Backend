import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADVISOR', 'VIEWER']).optional(), 
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
