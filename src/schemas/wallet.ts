import { z } from 'zod'

export const createWalletItemSchema = z.object({
  clientId: z.string().uuid(),
  assetType: z.string().min(1),
  percent: z.number().min(0).max(100),
})