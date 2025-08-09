import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createInsuranceSchema, updateInsuranceSchema } from '../schemas/insurance'
import { z } from 'zod'

export async function insuranceRoutes(app: FastifyInstance) {
  app.post('/insurances', async (req, res) => {
    const parsed = createInsuranceSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send(parsed.error)

    const { clientId, type, coverage, premium, startDate } = parsed.data
    const insurance = await prisma.insurance.create({
      data: {
        clientId,
        type,
        coverage,
        premium: premium ?? null,
        startDate: startDate ? new Date(startDate) : null,
      },
    })
    return res.status(201).send(insurance)
  })

  app.get('/clients/:clientId/insurances', async (req, res) => {
    const { clientId } = req.params as { clientId: string }
    const items = await prisma.insurance.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })
    return res.send(items)
  })

  app.put('/insurances/:id', async (req, res) => {
    const { id } = req.params as { id: string }
    const parsed = updateInsuranceSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send(parsed.error)

    const { startDate, ...rest } = parsed.data
    const updated = await prisma.insurance.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
      },
    })
    return res.send(updated)
  })

  app.delete('/insurances/:id', async (req, res) => {
    const { id } = req.params as { id: string }
    await prisma.insurance.delete({ where: { id } })
    return res.status(204).send()
  })

  app.get('/clients/:clientId/insurances/distribution', async (req, res) => {
    const { clientId } = req.params as { clientId: string }

    const items = await prisma.insurance.findMany({
      where: { clientId },
      select: { type: true, coverage: true },
    })

    const total = items.reduce((acc, i) => acc + i.coverage, 0)
    if (total === 0) {
      return res.send({
        totalCoverage: 0,
        breakdown: [],
      })
    }

    const byType = items.reduce<Record<string, number>>((acc, i) => {
      acc[i.type] = (acc[i.type] ?? 0) + i.coverage
      return acc
    }, {})

    const breakdown = Object.entries(byType).map(([type, cov]) => ({
      type, coverage: cov, percent: Number(((cov / total) * 100).toFixed(2)),
    }))

    return res.send({
      totalCoverage: total,
      breakdown,
    })
  })
}
