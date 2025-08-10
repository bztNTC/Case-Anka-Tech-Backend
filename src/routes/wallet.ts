import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createWalletSchema = z.object({
  clientId: z.string().uuid(),
  assetType: z.string().min(1),
  percent: z.number().min(0).max(100),
})

export async function walletRoutes(app: FastifyInstance) {
  app.post('/wallet', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const result = createWalletSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const walletItem = await prisma.wallet.create({ data: result.data })
    return res.status(201).send(walletItem)
  })

  app.get('/clients/:clientId/wallet', { preHandler: [app.authenticate] }, async (req, res) => {
    const { clientId } = req.params as { clientId: string }

    const wallet = await prisma.wallet.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    return res.send(wallet)
  })

  app.delete('/wallet/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }

    await prisma.wallet.delete({ where: { id } })
    return res.status(204).send()
  })
}
