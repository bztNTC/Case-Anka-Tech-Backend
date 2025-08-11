import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'

import { env } from './env'
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
import { importRoutes } from './routes/imports'

const app = Fastify({
  logger: true, 
})

app.register(cors, { origin: true })
app.register(helmet)
app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
})

app.register(swagger, {
  openapi: {
    info: { title: 'Planner API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }],
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
app.register(importRoutes)

app.setErrorHandler((err, _req, rep) => {
  if ((err as any)?.name === 'ZodError') {
    return rep.status(400).send({ error: 'ValidationError', details: (err as any).issues })
  }
  if ((err as any)?.code === 'P2002') {
    return rep.status(409).send({ error: 'Unique constraint violated' })
  }
  app.log.error(err)
  return rep.status(500).send({ error: 'Internal Server Error' })
})

async function start() {
  try {
    const port = env.PORT
    const host = '0.0.0.0'
    await app.listen({ port, host })
    console.log(`🚀 HTTP server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
