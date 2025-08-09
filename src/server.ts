import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { healthcheckRoutes } from './routes/healthcheck'
import { clientRoutes } from './routes/clients'
import { goalRoutes } from './routes/goals'
import { walletRoutes } from './routes/wallet'
import { alignmentRoutes } from './routes/alignment'
import { projectionRoutes } from './routes/projection'
import { eventRoutes } from './routes/events'
import { simulationRoutes } from './routes/simulations'

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

app.register(goalRoutes)

app.register(walletRoutes)

app.register(alignmentRoutes)

app.register(projectionRoutes)

app.register(eventRoutes)

app.register(simulationRoutes)

app.listen({ port: 3333 }, () => {
  console.log('🚀 HTTP server running on http://localhost:3333')
})
