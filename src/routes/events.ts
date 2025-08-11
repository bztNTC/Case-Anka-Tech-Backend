import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createEventSchema, updateEventSchema } from '../schemas/event'

export async function eventRoutes(app: FastifyInstance) {
  app.post('/events',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Events'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['clientId','type','value','frequency','startDate'],
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['DEPOSIT','WITHDRAWAL'] },
            value: { type: 'number' },
            frequency: { type: 'string', enum: ['ONCE','MONTHLY','ANNUAL'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              type: { type: 'string' },
              value: { type: 'number' },
              frequency: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','type','value','frequency','startDate','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const parsed = createEventSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).send(parsed.error)

      const data = parsed.data
      const event = await prisma.event.create({
        data: { ...data, endDate: data.endDate ?? null },
      })
      return res.status(201).send(event)
    }
  )

  app.get('/clients/:clientId/events',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Events'],
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
                type: { type: 'string' },
                value: { type: 'number' },
                frequency: { type: 'string' },
                startDate: { type: 'string' },
                endDate: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
              },
              required: ['id','clientId','type','value','frequency','startDate','createdAt'],
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { clientId } = req.params as { clientId: string }
      const events = await prisma.event.findMany({ where: { clientId } })
      return res.send(events)
    }
  )

  app.put('/events/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Events'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          description: 'Campos parciais para atualização',
          properties: {
            type: { type: 'string', enum: ['DEPOSIT','WITHDRAWAL'] },
            value: { type: 'number' },
            frequency: { type: 'string', enum: ['ONCE','MONTHLY','ANNUAL'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              type: { type: 'string' },
              value: { type: 'number' },
              frequency: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','type','value','frequency','startDate','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { id } = req.params as { id: string }
      const parsed = updateEventSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).send(parsed.error)

      const updated = await prisma.event.update({ where: { id }, data: parsed.data })
      return res.send(updated)
    }
  )

  app.delete('/events/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Events'],
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
      await prisma.event.delete({ where: { id } })
      return res.status(204).send()
    }
  )
}
