import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

describe('Auth', () => {
  let app: any

  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  async function bootstrapAdvisor(email = `admin-${Date.now()}@test.com`) {
    await request(app.server).post('/auth/signup').send({
      name: 'Admin',
      email,
      password: 'secret123',
      role: 'ADVISOR',
    }).expect(201)

    const login = await request(app.server).post('/auth/login').send({
      email,
      password: 'secret123',
    }).expect(200)

    return { token: login.body.token as string, email }
  }

  it('signup (bootstrap advisor) + login OK', async () => {
    const email = `admin-ok-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'Admin',
      email,
      password: 'secret123',
      role: 'ADVISOR',
    }).expect(201)

    const login = await request(app.server).post('/auth/login').send({
      email,
      password: 'secret123',
    })
    expect(login.status).toBe(200)
    expect(login.body.token).toBeTruthy()
  })

  it('signup duplicado -> 409', async () => {
    const email = `dup-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'One',
      email,
      password: '123456',
      role: 'ADVISOR',
    }).expect(201)

    const dup = await request(app.server).post('/auth/signup').send({
      name: 'Two',
      email,
      password: '123456',
    })
    expect(dup.status).toBe(409)
  })

  it('signup inválido (zod) -> 400', async () => {
    const bad = await request(app.server).post('/auth/signup').send({
      name: '',
      email: 'not-an-email',
      password: '1',
    })
    expect(bad.status).toBe(400)
  })

  it('criar ADVISOR após bootstrap sem token -> 401', async () => {
    await bootstrapAdvisor()
    const res = await request(app.server).post('/auth/signup').send({
      name: 'New Admin',
      email: `no-token-${Date.now()}@test.com`,
      password: '123456',
      role: 'ADVISOR',
    })
    expect(res.status).toBe(401)
  })

  it('viewer logado tentando criar ADVISOR -> 403', async () => {
    const { token: adminToken } = await bootstrapAdvisor()

    const viewerEmail = `viewer-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Viewer',
        email: viewerEmail,
        password: '123456',
        role: 'VIEWER',
      }).expect(201)

    const vLogin = await request(app.server).post('/auth/login').send({
      email: viewerEmail,
      password: '123456',
    }).expect(200)
    const vToken = vLogin.body.token as string

    const createAdvisor = await request(app.server).post('/auth/signup')
      .set('Authorization', `Bearer ${vToken}`)
      .send({
        name: 'Blocked',
        email: `blocked-${Date.now()}@test.com`,
        password: '123456',
        role: 'ADVISOR',
      })
    expect(createAdvisor.status).toBe(403)
  })

  it('login inválido (zod) -> 400', async () => {
    const res = await request(app.server).post('/auth/login').send({
      email: 'bad',
      password: '1',
    })
    expect(res.status).toBe(400)
  })

  it('login com e-mail inexistente -> 401', async () => {
    const res = await request(app.server).post('/auth/login').send({
      email: `ghost-${Date.now()}@test.com`,
      password: '123456',
    })
    expect(res.status).toBe(401)
  })

  it('login com senha errada -> 401', async () => {
    const email = `user-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'U',
      email,
      password: 'rightpass',
      role: 'ADVISOR',
    }).expect(201)

    const res = await request(app.server).post('/auth/login').send({
      email,
      password: 'wrongpass',
    })
    expect(res.status).toBe(401)
  })

  it('/me com e sem token', async () => {
    const { token } = await bootstrapAdvisor()
    const me = await request(app.server).get('/me').set('Authorization', `Bearer ${token}`)
    expect(me.status).toBe(200)
    expect(me.body.user).toBeTruthy()
    const meNoAuth = await request(app.server).get('/me')
    expect(meNoAuth.status).toBe(401)
  })
})
