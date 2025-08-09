import { z } from 'zod'

export const createSimulationSchema = z.object({
  rateAnnual: z.number().positive().max(2).default(0.04), // 4% default; limite sanidade 200% a.a.
  endYear: z.number().int().min(new Date().getFullYear()).max(2060).default(2060),
  title: z.string().min(1).optional(),
})
