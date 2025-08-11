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
  app.post('/goals',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Goals'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['clientId','title','target','targetDate'],
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1 },
            target: { type: 'number', minimum: 0 },
            targetDate: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              title: { type: 'string' },
              target: { type: 'number' },
              targetDate: { type: 'string' },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','title','target','targetDate','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const result = createGoalSchema.safeParse(req.body)
      if (!result.success) return res.status(400).send(result.error)

      const goal = await prisma.goal.create({ data: result.data })
      return res.status(201).send(goal)
    }
  )

  app.get('/clients/:clientId/goals',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Goals'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { clientId: { type: 'string', format: 'uuid' } },
          required: ['clientId'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                clientId: { type: 'string' },
                title: { type: 'string' },
                target: { type: 'number' },
                targetDate: { type: 'string' },
                createdAt: { type: 'string' },
              },
              required: ['id','clientId','title','target','targetDate','createdAt'],
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { clientId } = req.params as { clientId: string }

      const goals = await prisma.goal.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      })
      return res.send(goals)
    }
  )

  app.delete('/goals/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Goals'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        response: {
          204: { type: 'null', description: 'No Content' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { id } = req.params as { id: string }
      await prisma.goal.delete({ where: { id } })
      return res.status(204).send()
    }
  )
}
