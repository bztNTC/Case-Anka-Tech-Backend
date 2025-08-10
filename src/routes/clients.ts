import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createClientSchema, updateClientSchema } from '../schemas/client'

export async function clientRoutes(app: FastifyInstance) {
  app.get('/clients', { preHandler: [app.authenticate] }, async () => {
    return prisma.client.findMany()
  })

  app.get('/clients/:id', { preHandler: [app.authenticate] }, async (req, res) => {
    const { id } = req.params as { id: string }
    const client = await prisma.client.findUnique({ where: { id } })

    if (!client) return res.status(404).send({ error: 'Client not found' })
    return client
  })

  app.post('/clients', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const result = createClientSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const client = await prisma.client.create({ data: result.data })
    return res.status(201).send(client)
  })

  app.put('/clients/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }
    const result = updateClientSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const client = await prisma.client.update({
      where: { id },
      data: result.data,
    })
    return client
  })

  app.delete('/clients/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }
    await prisma.client.delete({ where: { id } })
    return res.status(204).send()
  })
}
