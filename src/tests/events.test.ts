import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'admin@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'admin@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente E', email: 'e@t.com', age: 35, status: true,
      familyType: 'single', totalWealth: 50000
    })
  return res.body.id as string
}

describe('Events', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('CRUD de eventos + listagem por cliente', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const created = await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        type: 'DEPOSIT',
        value: 500,
        frequency: 'MONTHLY',
        startDate: '2026-01-01T00:00:00.000Z'
      })
    expect(created.status).toBe(201)
    expect(created.body.clientId).toBe(clientId)
    const eventId = created.body.id

    const list = await request(app.server)
      .get(`/clients/${clientId}/events`)
      .set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body).toHaveLength(1)

    const updated = await request(app.server)
      .put(`/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 700 })
    expect(updated.status).toBe(200)
    expect(updated.body.value).toBe(700)

    const del = await request(app.server)
      .delete(`/events/${eventId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const list2 = await request(app.server)
      .get(`/clients/${clientId}/events`)
      .set('Authorization', `Bearer ${token}`)
    expect(list2.body).toHaveLength(0)
  })

    it('POST /events -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const bad = await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,                
        type: 'DEPOSIT',         
        value: 'cinquenta',      
        frequency: 'MONTHLY',   
      } as any)

    expect(bad.status).toBe(400)
    expect(bad.body).toBeTruthy() 
  })

  it('PUT /events/:id -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const created = await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        type: 'DEPOSIT',
        value: 100,
        frequency: 'ONCE',
        startDate: '2026-01-01T00:00:00.000Z',
      }).expect(201)

    const badUpd = await request(app.server)
      .put(`/events/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        value: 'setecentos',   
        frequency: 'WEEKLY',   
      } as any)

    expect(badUpd.status).toBe(400)
    expect(badUpd.body).toBeTruthy()
  })

})
