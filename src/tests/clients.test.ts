import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

describe('Clients', () => {
  let app: any
  let adminToken: string

  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()

    const adminEmail = `admin-clients-${Date.now()}@test.com`
    await request(app.server).post('/auth/signup').send({
      name: 'Admin',
      email: adminEmail,
      password: 'secret123',
      role: 'ADVISOR',
    }).expect(201)
    const login = await request(app.server).post('/auth/login').send({
      email: adminEmail,
      password: 'secret123',
    }).expect(200)
    adminToken = login.body.token
  })

  afterEach(async () => {
    await app.close()
  })

  async function makeViewerToken() {
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
    return vLogin.body.token as string
  }

  it('GET /clients sem token -> 401', async () => {
    const res = await request(app.server).get('/clients')
    expect(res.status).toBe(401)
  })

  it('CRUD completo como ADVISOR + 404 após delete', async () => {
    const create = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Maria',
        email: `maria-${Date.now()}@example.com`,
        age: 40,
        status: true,
        familyType: 'casal',
        totalWealth: 100000,
      })
    expect(create.status).toBe(201)
    const id = create.body.id

    const list = await request(app.server)
      .get('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body)).toBe(true)
    expect(list.body.find((c: any) => c.id === id)).toBeTruthy()

    const one = await request(app.server)
      .get(`/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(one.status).toBe(200)
    expect(one.body.id).toBe(id)

    const upd = await request(app.server)
      .put(`/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Maria Atualizada' })
    expect(upd.status).toBe(200)
    expect(upd.body.name).toBe('Maria Atualizada')

    const del = await request(app.server)
      .delete(`/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(del.status).toBe(204)

    const notFound = await request(app.server)
      .get(`/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(notFound.status).toBe(404)
  })

  it('GET /clients/:id retorna 404 quando não existe', async () => {
    const res = await request(app.server)
      .get('/clients/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      .set('Authorization', `Bearer ${adminToken}`)
    expect([400, 404]).toContain(res.status)
  })

  it('VIEWER não pode POST/PUT/DELETE (403)', async () => {
    const viewerToken = await makeViewerToken()

    const post = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Bloqueado',
        email: `b-${Date.now()}@ex.com`,
        age: 30,
        status: true,
        familyType: 'single',
        totalWealth: 1,
      })
    expect(post.status).toBe(403)

    const created = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alvo',
        email: `alvo-${Date.now()}@ex.com`,
        age: 31,
        status: true,
        familyType: 'single',
        totalWealth: 10,
      }).expect(201)
    const id = created.body.id

    const put = await request(app.server)
      .put(`/clients/${id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Hack' })
    expect(put.status).toBe(403)

    const del = await request(app.server)
      .delete(`/clients/${id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    expect(del.status).toBe(403)
  })

  it('POST inválido (Zod) -> 400', async () => {
    const bad = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '',                 
        email: 'not-an-email',     
        age: 'x',                 
        status: 'true',            
        familyType: '',            
        totalWealth: -10           
      } as any)
    expect(bad.status).toBe(400)
  })

    it('PUT inválido (Zod) -> 400', async () => {
    const created = await request(app.server)
      .post('/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alvo PUT',
        email: `alvo-put-${Date.now()}@ex.com`,
        age: 25,
        status: true,
        familyType: 'single',
        totalWealth: 1000,
      })
      .expect(201)

    const id = created.body.id

    const bad = await request(app.server)
      .put(`/clients/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'nao-e-email', 
        age: 'trinta',       
        status: 'true',      
      } as any)

    expect(bad.status).toBe(400)
    expect(bad.body).toBeTruthy()
  })

})
