import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { signUpSchema, loginSchema } from '../schemas/auth'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance) {
  async function noUsersYet() {
    const count = await prisma.user.count()
    return count === 0
  }

  app.post('/auth/signup', {
    preHandler: [],
    schema: {
      tags: ['Auth'],
      security: [],
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['ADVISOR', 'VIEWER'] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        409: { type: 'object', properties: { error: { type: 'string' } } },
      }
    }
  }, async (req, rep) => {
    const parsed = signUpSchema.safeParse(req.body)
    if (!parsed.success) return rep.status(400).send(parsed.error)

    const { name, email, password } = parsed.data
    let requestedRole = parsed.data.role ?? 'VIEWER'

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return rep.status(409).send({ error: 'E-mail já cadastrado' })

    if (requestedRole === 'ADVISOR') {
      const bootstrap = await noUsersYet()
      if (!bootstrap) {
        try {
          await req.jwtVerify()
        } catch {
          return rep.status(401).send({ error: 'Unauthorized' })
        }
        if (req.user.role !== 'ADVISOR') {
          return rep.status(403).send({ error: 'Forbidden' })
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: requestedRole as 'ADVISOR' | 'VIEWER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return rep.status(201).send(user)
  })

  app.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      security: [], 
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
              }
            }
          }
        },
        400: { type: 'object', properties: { error: { type: 'string' } } },
        401: { type: 'object', properties: { error: { type: 'string' } } },
      }
    }
  }, async (req, rep) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return rep.status(400).send(parsed.error)

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return rep.status(401).send({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return rep.status(401).send({ error: 'Invalid credentials' })

    const token = await rep.jwtSign({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    })

    return rep.send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  })

  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    return { user: req.user }
  })
}
