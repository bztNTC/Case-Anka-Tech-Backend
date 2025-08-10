import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'proj@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'proj@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string, overrides: Partial<any> = {}) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente P',
      email: `p${Date.now()}@t.com`,
      age: 33,
      status: true,
      familyType: 'single',
      totalWealth: 100000,
      ...overrides,
    })
  return res.body
}

describe('Projection', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('gera projeção com taxa default e considera eventos', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        type: 'DEPOSIT',
        value: 500,
        frequency: 'MONTHLY',
        startDate: `${new Date().getFullYear()}-01-01T00:00:00.000Z`
      }).expect(201)

    const res = await request(app.server)
      .get(`/clients/${client.id}/projection`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.clientId).toBe(client.id)
    expect(res.body.rateAnnual).toBeCloseTo(0.04, 5)
    expect(res.body.eventsCount).toBe(1)
    expect(Array.isArray(res.body.projection)).toBe(true)
    expect(res.body.projection.length).toBeGreaterThan(0)

    const first = res.body.projection[0].projectedValue
    const last = res.body.projection[res.body.projection.length - 1].projectedValue
    expect(last).toBeGreaterThan(first)
  })

  it('retorna 400 se totalWealth = 0', async () => {
    const token = await bootstrapAdvisor(app)
    const c0 = await createClient(app, token, { totalWealth: 0 })

    const res = await request(app.server)
      .get(`/clients/${c0.id}/projection`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/patrimônio atual/i)
  })

  it('retorna 404 quando cliente não existe', async () => {
    const token = await bootstrapAdvisor(app)
    const c = await createClient(app, token)

    await request(app.server)
      .delete(`/clients/${c.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.server)
      .get(`/clients/${c.id}/projection`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404) 
  })

  it('rate vazio ("") mantém taxa default 0.04', async () => {
    const token = await bootstrapAdvisor(app)
    const c = await createClient(app, token)

    const res = await request(app.server)
      .get(`/clients/${c.id}/projection?rate=`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.rateAnnual).toBeCloseTo(0.04, 5)
  })

  it('rate inválido ("abc") mantém taxa default 0.04', async () => {
    const token = await bootstrapAdvisor(app)
    const c = await createClient(app, token)

    const res = await request(app.server)
      .get(`/clients/${c.id}/projection?rate=abc`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.rateAnnual).toBeCloseTo(0.04, 5) 
  })

  it('rate como inteiro "5" vira 0.05', async () => {
    const token = await bootstrapAdvisor(app)
    const c = await createClient(app, token)

    const res = await request(app.server)
      .get(`/clients/${c.id}/projection?rate=5`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.rateAnnual).toBeCloseTo(0.05, 5)
  })

  it('evento com endDate definido cobre e.endDate.toISOString()', async () => {
    const token = await bootstrapAdvisor(app)
    const c = await createClient(app, token)

    await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: c.id,
        type: 'DEPOSIT',
        value: 200,
        frequency: 'ANNUAL',
        startDate: `${new Date().getFullYear()}-01-01T00:00:00.000Z`,
        endDate: `${new Date().getFullYear() + 2}-12-01T00:00:00.000Z`
      }).expect(201)

    const res = await request(app.server)
      .get(`/clients/${c.id}/projection`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.eventsCount).toBe(1)
    expect(Array.isArray(res.body.projection)).toBe(true)
  })
})
