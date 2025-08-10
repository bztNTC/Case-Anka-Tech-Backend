import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, rep: FastifyReply) => Promise<void>
    authorize: (...roles: Array<'ADVISOR' | 'VIEWER'>) =>
      (req: FastifyRequest, rep: FastifyReply) => Promise<void>
  }
}

export default fp(async function (app: FastifyInstance) {
  app.register(jwt, {
    secret: process.env.JWT_SECRET as string,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
  })

  app.decorate('authenticate', async (req, rep) => {
    try {
      await req.jwtVerify() 
    } catch {
      return rep.status(401).send({ error: 'Unauthorized' })
    }
  })

  app.decorate('authorize', (...roles) => {
    return async (req, rep) => {
      try {
        await req.jwtVerify()
      } catch {
        return rep.status(401).send({ error: 'Unauthorized' })
      }
      if (roles.length && !roles.includes(req.user.role)) {
        return rep.status(403).send({ error: 'Forbidden' })
      }
    }
  })
})
