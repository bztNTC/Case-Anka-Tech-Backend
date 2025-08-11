import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'

const createWalletSchema = z.object({
  clientId: z.string().uuid(),
  assetType: z.string().min(1),
  percent: z.number().min(0).max(100),
})

export async function walletRoutes(app: FastifyInstance) {
  app.post('/wallet',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Wallet'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['clientId','assetType','percent'],
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            assetType: { type: 'string', minLength: 1 },
            percent: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              assetType: { type: 'string' },
              percent: { type: 'number' },
              createdAt: { type: 'string' },
            },
            required: ['id','clientId','assetType','percent','createdAt'],
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const result = createWalletSchema.safeParse(req.body)
      if (!result.success) return res.status(400).send(result.error)

      const walletItem = await prisma.wallet.create({ data: result.data })
      return res.status(201).send(walletItem)
    }
  )

  app.get('/clients/:clientId/wallet',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Wallet'],
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
                assetType: { type: 'string' },
                percent: { type: 'number' },
                createdAt: { type: 'string' },
              },
              required: ['id','clientId','assetType','percent','createdAt'],
            },
          },
          401: { type: 'object', properties: { error: { type: 'string' } } },
        },
      },
    },
    async (req, res) => {
      const { clientId } = req.params as { clientId: string }
      const wallet = await prisma.wallet.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      })
      return res.send(wallet)
    }
  )

  app.delete('/wallet/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Wallet'],
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
      await prisma.wallet.delete({ where: { id } })
      return res.status(204).send()
    }
  )
}
