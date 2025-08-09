import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { simulateWealthCurve } from '../utils/simulateWealthCurve'

export async function projectionRoutes(app: FastifyInstance) {
  app.get('/clients/:id/projection', async (req, res) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const querySchema = z.object({
      rate: z
        .string()
        .optional()
    })

    const { id } = paramsSchema.parse(req.params)
    const { rate } = querySchema.parse(req.query)

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, totalWealth: true },
    })

    if (!client) {
      return res.status(404).send({ error: 'Cliente não encontrado' })
    }
    if (client.totalWealth <= 0) {
      return res.status(400).send({ error: 'Cliente sem patrimônio atual' })
    }

    let annualRate = 0.04
    if (rate !== undefined && rate !== null && rate !== '') {
      const n = Number(rate)
      if (Number.isFinite(n)) {
        annualRate = n > 1 ? n / 100 : n
      }
    }

    if (annualRate <= -0.99 || annualRate > 1.5) {
      return res.status(400).send({ error: 'Taxa anual inválida' })
    }

    const projection = simulateWealthCurve(client.totalWealth, annualRate, 2060)

    return res.send({
      clientId: client.id,
      rateAnnual: Number(annualRate.toFixed(6)),
      projection,
    })
  })
}
