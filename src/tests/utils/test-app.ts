import 'dotenv/config'
import Fastify from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import jwtPlugin from '../../plugins/jwt'
import { healthcheckRoutes } from '../../routes/healthcheck'
import { authRoutes } from '../../routes/auth'
import { clientRoutes } from '../../routes/clients'
import { goalRoutes } from '../../routes/goals'
import { walletRoutes } from '../../routes/wallet'
import { alignmentRoutes } from '../../routes/alignment'
import { projectionRoutes } from '../../routes/projection'
import { eventRoutes } from '../../routes/events'
import { simulationRoutes } from '../../routes/simulations'
import { insuranceRoutes } from '../../routes/insurances'

export async function buildTestApp() {
  const app = Fastify()
  app.register(swagger)
  app.register(swaggerUI)
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
  await app.ready()
  return app
}
