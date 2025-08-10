import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createEventSchema, updateEventSchema } from '../schemas/event'

export async function eventRoutes(app: FastifyInstance) {
  app.post('/events', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send(parsed.error)

    const data = parsed.data
    const event = await prisma.event.create({
      data: {
        ...data,
        endDate: data.endDate ?? null,
      },
    })
    return res.status(201).send(event)
  })

  app.get('/clients/:clientId/events', { preHandler: [app.authenticate] }, async (req, res) => {
    const { clientId } = req.params as { clientId: string }
    const events = await prisma.event.findMany({ where: { clientId } })
    return res.send(events)
  })

  app.put('/events/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }
    const parsed = updateEventSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).send(parsed.error)

    const updated = await prisma.event.update({ where: { id }, data: parsed.data })
    return res.send(updated)
  })

  app.delete('/events/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }
    await prisma.event.delete({ where: { id } })
    return res.status(204).send()
  })
}
