import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function alignmentRoutes(app: FastifyInstance) {
  app.get(
    '/clients/:id/alignment',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Alignment'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              clientId: { type: 'string' },
              alignmentPercent: { type: 'string', description: 'Percentual com 2 casas (ex.: "85.23")' },
              status: { type: 'string', enum: ['verde','amarelo-claro','amarelo-escuro','vermelho'] },
              patrimonioAtual: { type: 'number' },
              metasTotal: { type: 'number' },
            },
            required: ['clientId','alignmentPercent','status','patrimonioAtual','metasTotal'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          404: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
        },
      },
    },
    async (req, res) => {
      const { id } = req.params as { id: string }

      const client = await prisma.client.findUnique({
        where: { id },
        include: { goals: true },
      })

      if (!client) {
        return res.status(404).send({ error: 'Cliente não encontrado' })
      }

      if (client.totalWealth === 0) {
        return res.status(400).send({ error: 'Patrimônio atual é 0' })
      }

      const totalGoals = client.goals.reduce((acc, goal) => acc + goal.target, 0)
      const alignment = (totalGoals / client.totalWealth) * 100

      let status = ''
      if (alignment > 90) status = 'verde'
      else if (alignment > 70) status = 'amarelo-claro'
      else if (alignment > 50) status = 'amarelo-escuro'
      else status = 'vermelho'

      return res.send({
        clientId: client.id,
        alignmentPercent: alignment.toFixed(2),
        status,
        patrimonioAtual: client.totalWealth,
        metasTotal: totalGoals,
      })
    }
  )
}
