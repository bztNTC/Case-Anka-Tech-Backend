import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

type ImportState = {
  id: string
  total: number
  processed: number
  done: boolean
  error?: string
}
const imports = new Map<string, ImportState>()

export async function importRoutes(app: FastifyInstance) {
  app.post('/imports/clients', { preHandler: [app.authorize('ADVISOR')] }, async (req, res) => {
    const id = randomUUID()
    const state: ImportState = { id, total: 100, processed: 0, done: false }
    imports.set(id, state)

    const timer = setInterval(() => {
      const st = imports.get(id)
      if (!st) return clearInterval(timer)
      st.processed += 10
      if (st.processed >= st.total) {
        st.processed = st.total
        st.done = true
        clearInterval(timer)
      }
    }, 300)

    return res.status(202).send({ importId: id })
  })

  app.get('/imports/:id/stream', { preHandler: [app.authenticate] }, async (req, res) => {
    const { id } = (req.params as any)
    res.raw.setHeader('Content-Type', 'text/event-stream')
    res.raw.setHeader('Cache-Control', 'no-cache')
    res.raw.setHeader('Connection', 'keep-alive')

    const send = (data: any) => {
      res.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const iv = setInterval(() => {
      const st = imports.get(id)
      if (!st) {
        send({ error: 'not_found' })
        clearInterval(iv)
        return res.raw.end()
      }
      const progress = Math.round((st.processed / st.total) * 100)
      send({ id: st.id, processed: st.processed, total: st.total, progress, done: st.done })
      if (st.done) {
        clearInterval(iv)
        return res.raw.end()
      }
    }, 400)

    req.raw.on('close', () => clearInterval(iv))
  })
}
