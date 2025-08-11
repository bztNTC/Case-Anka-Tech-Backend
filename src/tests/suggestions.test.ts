import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  const email = `sugg-admin-${Date.now()}@t.com`
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email, password: 'secret123', role: 'ADVISOR'
  }).expect(201)
  const login = await request(app.server).post('/auth/login').send({
    email, password: 'secret123'
  }).expect(200)
  return login.body.token as string
}

async function createClient(app: any, token: string, overrides: Partial<any> = {}) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente Sug',
      email: `cs-${Date.now()}@t.com`,
      age: 30,
      status: true,
      familyType: 'single',
      totalWealth: 100000,
      ...overrides,
    }).expect(201)
  return res.body
}

describe('Suggestions', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('401 sem token', async () => {
    const res = await request(app.server).get('/clients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/suggestions')
    expect(res.status).toBe(401)
  })

  it('404 cliente não encontrado', async () => {
    const token = await bootstrapAdvisor(app)
    const res = await request(app.server)
      .get('/clients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/suggestions')
      .set('Authorization', `Bearer ${token}`)
    expect([400,404]).toContain(res.status)
  })

  it('retorna PMT necessário quando metas > projeção sem aportes', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token, { totalWealth: 100000 })

    await request(app.server).post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id, title: 'Meta 1', target: 70000,
        targetDate: '2030-06-15T12:00:00.000Z'
      }).expect(201)

    await request(app.server).post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id, title: 'Meta 2', target: 50000,
        targetDate: '2031-06-15T12:00:00.000Z'
      }).expect(201)

    const res = await request(app.server)
      .get(`/clients/${client.id}/suggestions?months=24&rateAnnual=0.04`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.clientId).toBe(client.id)
    expect(res.body.totalGoals).toBe(120000)
    expect(res.body.months).toBe(24)
    expect(res.body.rateAnnual).toBeCloseTo(0.04, 6)
    expect(res.body.requiredMonthly).toBeGreaterThan(0)
    expect(Array.isArray(res.body.suggestions)).toBe(true)
    expect(res.body.suggestions[0]).toMatch(/Aumente a contribuição/i)
  })

  it('se projeção sem aportes já atinge metas, requiredMonthly=0 e mensagem positiva', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token, { totalWealth: 300000 })

    await request(app.server).post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id, title: 'Meta', target: 100000,
        targetDate: '2030-06-15T12:00:00.000Z'
      }).expect(201)

    const res = await request(app.server)
      .get(`/clients/${client.id}/suggestions?months=24&rateAnnual=0.04`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.requiredMonthly).toBe(0)
    expect(res.body.suggestions[0]).toMatch(/já atinge as metas/i)
  })
})
