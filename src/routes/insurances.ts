import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createInsuranceSchema, updateInsuranceSchema } from '../schemas/insurance'
import { z } from 'zod'

export async function insuranceRoutes(app: FastifyInstance) {
  app.post(
    '/insurances',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Insurances'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['clientId','type','coverage'],
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['LIFE','DISABILITY'] },
            coverage: { type: 'number', minimum: 0 },
            premium: { type: 'number', nullable: true },
            startDate: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              type: { type: 'string' },
              coverage: { type: 'number' },
              premium: { type: 'number', nullable: true },
              startDate: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','type','coverage','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
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
    }
  )

  app.get(
    '/clients/:clientId/insurances',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Insurances'],
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
                coverage: { type: 'number' },
                premium: { type: 'number', nullable: true },
                startDate: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
              },
              required: ['id','clientId','type','coverage','createdAt'],
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { clientId } = req.params as { clientId: string }
      const items = await prisma.insurance.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      })
      return res.send(items)
    }
  )

  app.put(
    '/insurances/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Insurances'],
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
            type: { type: 'string', enum: ['LIFE','DISABILITY'] },
            coverage: { type: 'number' },
            premium: { type: 'number', nullable: true },
            startDate: { type: 'string', format: 'date-time', nullable: true },
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
              coverage: { type: 'number' },
              premium: { type: 'number', nullable: true },
              startDate: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','type','coverage','createdAt'],
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
    }
  )

  app.delete(
    '/insurances/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Insurances'],
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
      await prisma.insurance.delete({ where: { id } })
      return res.status(204).send()
    }
  )

  app.get(
    '/clients/:clientId/insurances/distribution',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Insurances'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { clientId: { type: 'string', format: 'uuid' } },
          required: ['clientId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              totalCoverage: { type: 'number' },
              breakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    coverage: { type: 'number' },
                    percent: { type: 'number' },
                  },
                  required: ['type','coverage','percent'],
                },
              },
            },
            required: ['totalCoverage','breakdown'],
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { clientId } = req.params as { clientId: string }

      const items = await prisma.insurance.findMany({
        where: { clientId },
        select: { type: true, coverage: true },
      })

      const total = items.reduce((acc, i) => acc + i.coverage, 0)
      if (total === 0) {
        return res.send({ totalCoverage: 0, breakdown: [] })
      }

      const byType = items.reduce<Record<string, number>>((acc, i) => {
        acc[i.type] = (acc[i.type] ?? 0) + i.coverage
        return acc
      }, {})

      const breakdown = Object.entries(byType).map(([type, cov]) => ({
        type,
        coverage: cov,
        percent: Number(((cov / total) * 100).toFixed(2)),
      }))

      return res.send({ totalCoverage: total, breakdown })
    }
  )
}
