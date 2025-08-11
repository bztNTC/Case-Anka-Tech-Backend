// src/routes/imports.ts
import { FastifyInstance, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { parse } from 'csv-parse'
import { randomUUID } from 'crypto'

type JobStatus = 'pending' | 'done' | 'error'
type Job = {
  total: number
  processed: number
  status: JobStatus
  error?: string
  subscribers: Set<FastifyReply>
}

const jobs = new Map<string, Job>()

function sseHeaders(rep: FastifyReply) {
  rep.headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }).code(200)
}
function sendEvent(rep: FastifyReply, event: string, data: any) {
  rep.raw.write(`event: ${event}\n`)
  rep.raw.write(`data: ${JSON.stringify(data)}\n\n`)
}
async function broadcast(jobId: string, event: string, data: any) {
  const job = jobs.get(jobId)
  if (!job) return
  for (const sub of job.subscribers) sendEvent(sub, event, { jobId, ...data })
}

export async function importRoutes(app: FastifyInstance) {
  // SSE progress
  app.get('/imports/clients/stream/:jobId', {
    preHandler: [app.authorize('ADVISOR')],
    schema: {
      tags: ['Imports'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { jobId: { type: 'string', format: 'uuid' } },
        required: ['jobId'],
      },
    },
  }, async (req, rep) => {
    const { jobId } = req.params as { jobId: string }
    const job = jobs.get(jobId)
    if (!job) return rep.status(404).send({ error: 'Job not found' })

    sseHeaders(rep)
    job.subscribers.add(rep)

    sendEvent(rep, 'snapshot', {
      status: job.status,
      processed: job.processed,
      total: job.total,
    })

    const keepAlive = setInterval(() => sendEvent(rep, 'ping', {}), 25000)
    rep.raw.on('close', () => {
      clearInterval(keepAlive)
      job.subscribers.delete(rep)
    })
  })

  // Upload CSV (multipart)
  app.post('/imports/clients', {
    preHandler: [app.authorize('ADVISOR')],
    attachValidation: true, // <- não falha a requisição se o body não "bater" no schema
    schema: {
      tags: ['Imports'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['file'],
        properties: {
          // <-- assim o Swagger UI exibe o botão de upload
          file: { type: 'string', format: 'binary', description: 'CSV de clientes' },
        },
      },
      response: {
        200: {
          type: 'object',
          required: ['jobId', 'message'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (req, rep) => {
    // Ignora erro de validação do AJV nesta rota (somente documentação do Swagger importa)
    // if ((req as any).validationError) app.log.warn((req as any).validationError)

    // pega o arquivo via multipart
    const part = await (req as any).file()
    if (!part?.file) {
      return rep.status(400).send({ error: 'file not provided (multipart/form-data)' })
    }

    const stream: NodeJS.ReadableStream = part.file

    const jobId = randomUUID()
    const job: Job = { total: 0, processed: 0, status: 'pending', subscribers: new Set() }
    jobs.set(jobId, job)

    ;(async () => {
      try {
        const parser = parse({ columns: true, skip_empty_lines: true, trim: true })
        stream.pipe(parser)

        for await (const row of parser) {
          job.total++
          const name = String(row.name ?? '').trim()
          const email = String(row.email ?? '').toLowerCase().trim()
          const age = Number(row.age ?? 0)
          const status = String(row.status ?? '').toLowerCase() === 'true'
          const familyType = String(row.familyType ?? '').trim()
          const totalWealth = Number(row.totalWealth ?? 0)

          if (!name || !email || !Number.isFinite(age)) continue

          try {
            await prisma.client.create({ data: { name, email, age, status, familyType, totalWealth } })
          } catch { /* ignora duplicados etc. */ }

          job.processed++
          await broadcast(jobId, 'progress', { processed: job.processed, total: job.total })
        }

        job.status = 'done'
        await broadcast(jobId, 'done', { processed: job.processed, total: job.total })
        for (const sub of job.subscribers) sub.raw.end()
        jobs.delete(jobId)
      } catch (err: any) {
        job.status = 'error'
        job.error = err?.message ?? 'unknown'
        await broadcast(jobId, 'error', { message: job.error })
        for (const sub of job.subscribers) sub.raw.end()
        jobs.delete(jobId)
      }
    })()

    return rep.send({ jobId, message: 'upload accepted; open SSE to track progress' })
  })
}
