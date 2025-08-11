import { z } from 'zod'

export const env = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter no mínimo 16 caracteres'),
  PORT: z.coerce.number().default(3333),
}).parse(process.env)
