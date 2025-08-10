import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

describe('middleware authenticate/authorize', () => {
  let app: any
  let adminToken: string
  let viewerToken: string

  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()

    // cria admin (advisor)
    const adminEmail = `admin-mid-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'Admin',
      email: adminEmail,
      password: 'secret123',
      role: 'ADVISOR',
    }).expect(201)
    const adminLogin = await request(app.server).post('/auth/login').send({
      email: adminEmail, password: 'secret123'
    }).expect(200)
    adminToken = adminLogin.body.token

    // cria viewer
    const viewerEmail = `viewer-mid-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Viewer',
        email: viewerEmail,
        password: '123456',
        role: 'VIEWER',
      }).expect(201)
    const vLogin = await request(app.server).post('/auth/login').send({
      email: viewerEmail, password: '123456'
    }).expect(200)
    viewerToken = vLogin.body.token
  })

  afterEach(async () => {
    await app.close()
  })

  it('authenticate: 401 sem token', async () => {
    const res = await request(app.server).get('/clients')
    expect(res.status).toBe(401)
  })

  it('authenticate: 401 com token inválido', async () => {
    const res = await request(app.server)
      .get('/clients')
      .set('Authorization', 'Bearer this.is.not.valid')
    expect(res.status).toBe(401)
  })

  it('authorize: viewer não pode criar cliente (403)', async () => {
    const res = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'X',
        email: `x-${Date.now()}@ex.com`,
        age: 30,
        status: true,
        familyType: 'single',
        totalWealth: 1,
      })
    expect(res.status).toBe(403)
  })

  it('authorize: advisor pode criar cliente (200/201)', async () => {
    const res = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ok',
        email: `ok-${Date.now()}@ex.com`,
        age: 29,
        status: true,
        familyType: 'single',
        totalWealth: 100,
      })
    expect([200,201]).toContain(res.status)
  })
})
