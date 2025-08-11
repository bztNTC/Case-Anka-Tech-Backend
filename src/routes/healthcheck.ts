import { FastifyInstance } from 'fastify'

export async function healthcheckRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      description: 'Verifica se o servidor está online',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' }
          }
        }
      }
    }
  }, async () => {
    return { status: 'ok' }
  })
}
