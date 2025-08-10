import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createGoalSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1),
  target: z.number().positive(),
  targetDate: z.string().datetime(), 
})

export async function goalRoutes(app: FastifyInstance) {
  app.post('/goals', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const result = createGoalSchema.safeParse(req.body)
    if (!result.success) return res.status(400).send(result.error)

    const goal = await prisma.goal.create({ data: result.data })
    return res.status(201).send(goal)
  })

  app.get('/clients/:clientId/goals', { preHandler: [app.authenticate] }, async (req, res) => {
    const { clientId } = req.params as { clientId: string }

    const goals = await prisma.goal.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    return res.send(goals)
  })

  app.delete('/goals/:id', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const { id } = req.params as { id: string }

    await prisma.goal.delete({ where: { id } })
    return res.status(204).send()
  })
}
