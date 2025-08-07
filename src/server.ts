import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { healthcheckRoutes } from './routes/healthcheck'
import { clientRoutes } from './routes/clients'

const app = Fastify()

app.register(swagger)
app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
})

app.register(healthcheckRoutes)

app.register(clientRoutes)

app.listen({ port: 3333 }, () => {
  console.log('🚀 HTTP server running on http://localhost:3333')
})
