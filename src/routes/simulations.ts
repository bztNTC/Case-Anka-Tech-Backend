import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { simulateWealthWithEvents } from '../utils/simulateWealthWithEvents'
import { createSimulationSchema } from '../schemas/simulation'

export async function simulationRoutes(app: FastifyInstance) {
  app.post('/clients/:id/simulations', async (req, res) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(req.params)

    const parsed = createSimulationSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send(parsed.error)
    const { rateAnnual, endYear, title } = parsed.data

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true, totalWealth: true },
    })
    if (!client) return res.status(404).send({ error: 'Cliente não encontrado' })
    if (client.totalWealth <= 0) return res.status(400).send({ error: 'Cliente sem patrimônio atual' })

    const events = await prisma.event.findMany({ where: { clientId: id } })
    const eventsSnapshot = events.map(e => ({
      id: e.id,
      type: e.type,
      value: e.value,
      frequency: e.frequency,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : null,
    }))

    const result = simulateWealthWithEvents(
      client.totalWealth,
      rateAnnual,
      eventsSnapshot.map(e => ({
        type: e.type,
        value: e.value,
        frequency: e.frequency,
        startDate: e.startDate,
        endDate: e.endDate,
      })),
      endYear
    )

    const sim = await prisma.simulation.create({
      data: {
        clientId: id,
        title: title ?? null,
        rateAnnual,
        endYear,
        initialWealth: client.totalWealth,
        eventsSnapshot,
        result,
      },
    })

    return res.status(201).send(sim)
  })

  app.get('/clients/:id/simulations', async (req, res) => {
    const paramsSchema = z.object({ id: z.string().uuid() })
    const { id } = paramsSchema.parse(req.params)

    const list = await prisma.simulation.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        rateAnnual: true,
        endYear: true,
        initialWealth: true,
        createdAt: true,
      },
    })

    return res.send(list)
  })

  app.get('/clients/:id/simulations/:simId', async (req, res) => {
    const paramsSchema = z.object({ id: z.string().uuid(), simId: z.string().uuid() })
    const { id, simId } = paramsSchema.parse(req.params)

    const sim = await prisma.simulation.findFirst({
      where: { id: simId, clientId: id },
    })
    if (!sim) return res.status(404).send({ error: 'Simulação não encontrada' })

    return res.send(sim)
  })

  app.delete('/clients/:id/simulations/:simId', async (req, res) => {
    const paramsSchema = z.object({ id: z.string().uuid(), simId: z.string().uuid() })
    const { id, simId } = paramsSchema.parse(req.params)

    const exists = await prisma.simulation.findFirst({ where: { id: simId, clientId: id } })
    if (!exists) return res.status(404).send({ error: 'Simulação não encontrada' })

    await prisma.simulation.delete({ where: { id: simId } })
    return res.status(204).send()
  })
}
