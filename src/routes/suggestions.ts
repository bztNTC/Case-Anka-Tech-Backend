import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(600).default(24),
  rateAnnual: z.coerce.number().min(0).max(1).default(0.04),
})

export async function suggestionRoutes(app: FastifyInstance) {
  app.get('/clients/:id/suggestions',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Suggestions'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'integer', minimum: 1, maximum: 600, default: 24 },
            rateAnnual: { type: 'number', minimum: 0, maximum: 1, default: 0.04 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              clientId: { type: 'string' },
              totalWealth: { type: 'number' },
              totalGoals: { type: 'number' },
              months: { type: 'integer' },
              rateAnnual: { type: 'number' },
              requiredMonthly: { type: 'number' },
              suggestions: { type: 'array', items: { type: 'string' } },
            },
            required: ['clientId','totalWealth','totalGoals','months','rateAnnual','requiredMonthly','suggestions'],
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
            required: ['error'],
          },
        },
      },
    },
    async (req, res) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(req.params)
      const { months, rateAnnual } = querySchema.parse(req.query)

      const client = await prisma.client.findUnique({
        where: { id }, include: { goals: true },
      })
      if (!client) return res.status(404).send({ error: 'Cliente não encontrado' })

      const totalGoals = client.goals.reduce((acc, g) => acc + g.target, 0)
      const PV = Math.max(client.totalWealth, 0)
      const i = Math.pow(1 + rateAnnual, 1 / 12) - 1
      const n = months
      const FV_noPMT = PV * Math.pow(1 + i, n)

      if (totalGoals <= FV_noPMT) {
        return res.send({
          clientId: id,
          totalWealth: PV,
          totalGoals,
          months,
          rateAnnual,
          requiredMonthly: 0,
          suggestions: ['Você já atinge as metas no horizonte considerado.'],
        })
      }

      const numerador = (totalGoals - PV * Math.pow(1 + i, n)) * i
      const denominador = Math.pow(1 + i, n) - 1
      let PMT = numerador / denominador
      if (!Number.isFinite(PMT) || PMT < 0) PMT = 0

      const requiredMonthly = Math.ceil(PMT)
      return res.send({
        clientId: id,
        totalWealth: PV,
        totalGoals,
        months,
        rateAnnual,
        requiredMonthly,
        suggestions: [
          `Aumente a contribuição em R$ ${requiredMonthly} por ${months} meses para atingir as metas.`,
        ],
      })
    }
  )
}
