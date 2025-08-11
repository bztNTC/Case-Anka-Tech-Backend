import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'

import jwtPlugin from './plugins/jwt'

import { healthcheckRoutes } from './routes/healthcheck'
import { authRoutes } from './routes/auth'
import { clientRoutes } from './routes/clients'
import { goalRoutes } from './routes/goals'
import { walletRoutes } from './routes/wallet'
import { alignmentRoutes } from './routes/alignment'
import { projectionRoutes } from './routes/projection'
import { eventRoutes } from './routes/events'
import { simulationRoutes } from './routes/simulations'
import { insuranceRoutes } from './routes/insurances'
import { suggestionRoutes } from './routes/suggestions'

const app = Fastify({
  logger: true, 
})

app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: { title: 'Planner API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Clients' },
      { name: 'Goals' },
      { name: 'Wallet' },
      { name: 'Events' },
      { name: 'Projection' },
      { name: 'Simulations' },
      { name: 'Insurances' },
      { name: 'Suggestions' }, 
      { name: 'Health' },
    ],
  },
})
app.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: false },
})

app.register(jwtPlugin)

app.register(healthcheckRoutes)
app.register(authRoutes)
app.register(clientRoutes)
app.register(goalRoutes)
app.register(walletRoutes)
app.register(alignmentRoutes)
app.register(projectionRoutes)
app.register(eventRoutes)
app.register(simulationRoutes)
app.register(insuranceRoutes)
app.register(suggestionRoutes)

async function start() {
  try {
    const port = Number(process.env.PORT ?? 3333)
    const host = '0.0.0.0'
    await app.listen({ port, host })
    console.log(`🚀 HTTP server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
