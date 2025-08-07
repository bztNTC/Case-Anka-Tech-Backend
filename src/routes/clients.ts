import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createClientSchema, updateClientSchema } from '../schemas/client'

export async function clientRoutes(app: FastifyInstance) {
  // GET all
  app.get('/clients', async () => {
    return prisma.client.findMany()
  })

  // GET by ID
  app.get('/clients/:id', async (req, res) => {
    const { id } = req.params as { id: string }
    const client = await prisma.client.findUnique({ where: { id } })

    if (!client) return res.status(404).send({ error: 'Client not found' })
    return client
  })

  // POST create
  app.post('/clients', async (req, res) => {
    const result = createClientSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const client = await prisma.client.create({ data: result.data })
    return res.status(201).send(client)
  })

  // PUT update
  app.put('/clients/:id', async (req, res) => {
    const { id } = req.params as { id: string }
    const result = updateClientSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const client = await prisma.client.update({
      where: { id },
      data: result.data,
    })

    return client
  })

  // DELETE
  app.delete('/clients/:id', async (req, res) => {
    const { id } = req.params as { id: string }

    await prisma.client.delete({ where: { id } })
    return res.status(204).send()
  })
}
