import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      role: 'ADVISOR' | 'VIEWER'
      email: string
      name: string
    }

    user: {
      sub: string
      role: 'ADVISOR' | 'VIEWER'
      email: string
      name: string
    }
  }
}
