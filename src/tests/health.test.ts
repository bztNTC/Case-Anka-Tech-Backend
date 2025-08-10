import request from 'supertest'
import { buildTestApp } from './utils/test-app'

describe('Health', () => {
  it('GET /health -> 200 ok', async () => {
    const app = await buildTestApp()
    const res = await request(app.server).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
    await app.close()
  })
})
