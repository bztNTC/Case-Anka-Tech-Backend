import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { simulateWealthWithEvents } from '../utils/simulateWealthWithEvents'
import { createSimulationSchema } from '../schemas/simulation'

export async function simulationRoutes(app: FastifyInstance) {
  app.post(
    '/clients/:id/simulations',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Simulations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['rateAnnual', 'endYear'],
          properties: {
            rateAnnual: { type: 'number', minimum: 0, maximum: 1, description: 'Ex.: 0.04 para 4% a.a.' },
            endYear: { type: 'integer', minimum: 2025, maximum: 2060 },
            title: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              title: { type: 'string', nullable: true },
              rateAnnual: { type: 'number' },
              endYear: { type: 'integer' },
              initialWealth: { type: 'number' },
              eventsSnapshot: { type: 'array', items: { type: 'object', additionalProperties: true } },
              result: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer' },
                    projectedValue: { type: 'number' },
                  },
                  required: ['year', 'projectedValue'],
                },
              },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','rateAnnual','endYear','initialWealth','eventsSnapshot','result','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
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
    }
  )

  app.get(
    '/clients/:id/simulations',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Simulations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string', nullable: true },
                rateAnnual: { type: 'number' },
                endYear: { type: 'integer' },
                initialWealth: { type: 'number' },
                createdAt: { type: 'string' },
              },
              required: ['id','rateAnnual','endYear','initialWealth','createdAt'],
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
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
    }
  )

  app.get(
    '/clients/:id/simulations/:simId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Simulations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            simId: { type: 'string', format: 'uuid' },
          },
          required: ['id','simId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              title: { type: 'string', nullable: true },
              rateAnnual: { type: 'number' },
              endYear: { type: 'integer' },
              initialWealth: { type: 'number' },
              eventsSnapshot: { type: 'array', items: { type: 'object', additionalProperties: true } },
              result: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer' },
                    projectedValue: { type: 'number' },
                  },
                  required: ['year', 'projectedValue'],
                },
              },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','rateAnnual','endYear','initialWealth','eventsSnapshot','result','createdAt'],
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const paramsSchema = z.object({ id: z.string().uuid(), simId: z.string().uuid() })
      const { id, simId } = paramsSchema.parse(req.params)

      const sim = await prisma.simulation.findFirst({
        where: { id: simId, clientId: id },
      })
      if (!sim) return res.status(404).send({ error: 'Simulação não encontrada' })

      return res.send(sim)
    }
  )

  app.delete(
    '/clients/:id/simulations/:simId',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Simulations'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            simId: { type: 'string', format: 'uuid' },
          },
          required: ['id','simId'],
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
      const paramsSchema = z.object({ id: z.string().uuid(), simId: z.string().uuid() })
      const { id, simId } = paramsSchema.parse(req.params)

      const exists = await prisma.simulation.findFirst({ where: { id: simId, clientId: id } })
      if (!exists) return res.status(404).send({ error: 'Simulação não encontrada' })

      await prisma.simulation.delete({ where: { id: simId } })
      return res.status(204).send()
    }
  )
}
