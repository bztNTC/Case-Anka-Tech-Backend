import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

describe('Alignment', () => {
  let app: any
  let token: string

  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()

    const adminEmail = `admin-alignment-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'Admin',
      email: adminEmail,
      password: 'secret123',
      role: 'ADVISOR',
    })
    const login = await request(app.server).post('/auth/login').send({
      email: adminEmail,
      password: 'secret123',
    })
    token = login.body.token
  })

  afterEach(async () => {
    await app.close()
  })

  async function mkClient(totalWealth: number, emailHint: string) {
    const res = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: emailHint,
        email: `${emailHint}-${Date.now()}@test.com`,
        age: 30,
        status: true,
        familyType: 'single',
        totalWealth,
      })
    return res.body.id as string
  }

  async function mkGoal(clientId: string, target: number) {
    await request(app.server)
      .post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        title: 'Meta',
        target,
        targetDate: '2035-01-01T00:00:00.000Z',
      })
  }

  it('401 sem token', async () => {
    const res = await request(app.server).get(
      '/clients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/alignment'
    )
    expect(res.status).toBe(401)
  })

  it('404 quando cliente não existe', async () => {
    const res = await request(app.server)
      .get('/clients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/alignment')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('400 quando patrimônio atual é 0', async () => {
    const id = await mkClient(0, 'zero')
    const res = await request(app.server)
      .get(`/clients/${id}/alignment`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Patrimônio atual é 0/i)
  })

  it('status verde (> 90%)', async () => {
    const id = await mkClient(100, 'verde')
    await mkGoal(id, 91)
    const res = await request(app.server)
      .get(`/clients/${id}/alignment`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('verde')
    expect(res.body.alignmentPercent).toBe('91.00')
  })

  it('status amarelo-claro (> 70% a 90%)', async () => {
    const id = await mkClient(100, 'amarelo-claro')
    await mkGoal(id, 85) 
    const res = await request(app.server)
      .get(`/clients/${id}/alignment`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('amarelo-claro')
    expect(res.body.alignmentPercent).toBe('85.00')
  })

  it('status amarelo-escuro (> 50% a 70%)', async () => {
    const id = await mkClient(100, 'amarelo-escuro')
    await mkGoal(id, 60) 
    const res = await request(app.server)
      .get(`/clients/${id}/alignment`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('amarelo-escuro')
    expect(res.body.alignmentPercent).toBe('60.00')
  })

  it('status vermelho (<= 50%)', async () => {
    const id = await mkClient(100, 'vermelho')
    await mkGoal(id, 50) 
    const res = await request(app.server)
      .get(`/clients/${id}/alignment`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('vermelho')
    expect(res.body.alignmentPercent).toBe('50.00')
  })
})
