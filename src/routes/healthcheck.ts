import { FastifyInstance } from 'fastify'

export async function healthcheckRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'ok' }
  })
}
