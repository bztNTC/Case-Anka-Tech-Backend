import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { simulateWealthWithEvents } from '../utils/simulateWealthWithEvents'

export async function projectionRoutes(app: FastifyInstance) {
  app.get(
    '/clients/:id/projection',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Projection'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            rate: { type: 'string', description: 'Taxa anual (ex.: 0.04 ou 4)' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              clientId: { type: 'string' },
              rateAnnual: { type: 'number' },
              eventsCount: { type: 'integer' },
              projection: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer' },
                    projectedValue: { type: 'number' },
                  },
                  required: ['year','projectedValue'],
                },
              },
            },
            required: ['clientId','rateAnnual','eventsCount','projection'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          404: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
        },
      },
    },
    async (req, res) => {
      const paramsSchema = z.object({ id: z.string().uuid() })
      const querySchema = z.object({ rate: z.string().optional() })

      const { id } = paramsSchema.parse(req.params)
      const { rate } = querySchema.parse(req.query)

      const client = await prisma.client.findUnique({
        where: { id },
        select: { id: true, totalWealth: true },
      })
      if (!client) return res.status(404).send({ error: 'Cliente não encontrado' })
      if (client.totalWealth <= 0) return res.status(400).send({ error: 'Cliente sem patrimônio atual' })

      let annualRate = 0.04
      if (rate !== undefined && rate !== null && rate !== '') {
        const n = Number(rate)
        if (Number.isFinite(n)) annualRate = n > 1 ? n / 100 : n
      }

      const events = await prisma.event.findMany({ where: { clientId: id } })

      const projection = simulateWealthWithEvents(
        client.totalWealth,
        annualRate,
        events.map(e => ({
          type: e.type,
          value: e.value,
          frequency: e.frequency,
          startDate: e.startDate.toISOString(),
          endDate: e.endDate ? e.endDate.toISOString() : undefined,
        }))
      )

      return res.send({
        clientId: client.id,
        rateAnnual: Number(annualRate.toFixed(6)),
        eventsCount: events.length,
        projection,
      })
    }
  )
}
