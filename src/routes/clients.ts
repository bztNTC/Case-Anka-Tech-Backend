import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { createClientSchema, updateClientSchema } from '../schemas/client'

export async function clientRoutes(app: FastifyInstance) {
  app.get('/clients',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                age: { type: 'number' },
                status: { type: 'boolean' },
                familyType: { type: 'string' },
                totalWealth: { type: 'number' },
                createdAt: { type: 'string' },
              },
              required: ['id','name','email','age','status','familyType','totalWealth','createdAt']
            }
          },
          401: { type: 'object', properties: { error: { type: 'string' } } }
        }
      }
    },
    async () => prisma.client.findMany()
  )

  app.get('/clients/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id']
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' },
              status: { type: 'boolean' },
              familyType: { type: 'string' },
              totalWealth: { type: 'number' },
              createdAt: { type: 'string' },
            },
            required: ['id','name','email','age','status','familyType','totalWealth','createdAt']
          },
          404: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] },
          401: { type: 'object', properties: { error: { type: 'string' } } }
        }
      }
    },
    async (req, res) => {
      const { id } = req.params as { id: string }
      const client = await prisma.client.findUnique({ where: { id } })
      if (!client) return res.status(404).send({ error: 'Client not found' })
      return client
    }
  )

  app.post('/clients',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name','email','age','status','familyType'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            age: { type: 'number' },
            status: { type: 'boolean' },
            familyType: { type: 'string' },
            totalWealth: { type: 'number', default: 0 },
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' },
              status: { type: 'boolean' },
              familyType: { type: 'string' },
              totalWealth: { type: 'number' },
              createdAt: { type: 'string' },
            },
            required: ['id','name','email','age','status','familyType','totalWealth','createdAt']
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          409: { type: 'object', properties: { error: { type: 'string' } } }, 
        }
      }
    },
    async (req, res) => {
      const result = createClientSchema.safeParse(req.body)
      if (!result.success) return res.status(400).send(result.error)
      const client = await prisma.client.create({ data: result.data })
      return res.status(201).send(client)
    }
  )

  app.put('/clients/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id']
        },
        body: {
          type: 'object',
          description: 'Campos parciais para update',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: 'number' },
            status: { type: 'boolean' },
            familyType: { type: 'string' },
            totalWealth: { type: 'number' },
          },
          additionalProperties: false
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              age: { type: 'number' },
              status: { type: 'boolean' },
              familyType: { type: 'string' },
              totalWealth: { type: 'number' },
              createdAt: { type: 'string' },
            },
            required: ['id','name','email','age','status','familyType','totalWealth','createdAt']
          },
          400: { type: 'object', properties: { error: { type: 'string' } } },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        }
      }
    },
    async (req, res) => {
      const { id } = req.params as { id: string }
      const result = updateClientSchema.safeParse(req.body)
      if (!result.success) return res.status(400).send(result.error)

      const client = await prisma.client.update({
        where: { id },
        data: result.data,
      })
      return client
    }
  )

  app.delete('/clients/:id',
    {
      preHandler: [app.authorize('ADVISOR')],
      schema: {
        tags: ['Clients'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id']
        },
        response: {
          204: { type: 'null', description: 'No Content' },
          401: { type: 'object', properties: { error: { type: 'string' } } },
          403: { type: 'object', properties: { error: { type: 'string' } } },
          404: { type: 'object', properties: { error: { type: 'string' } } },
        }
      }
    },
    async (req, res) => {
      const { id } = req.params as { id: string }
      await prisma.client.delete({ where: { id } })
      return res.status(204).send()
    }
  )
}
