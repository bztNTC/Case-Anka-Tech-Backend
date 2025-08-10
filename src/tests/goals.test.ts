import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'admin2@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'admin2@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente G', email: 'g@t.com', age: 30, status: true,
      familyType: 'casal', totalWealth: 100000
    })
  return res.body.id as string
}

describe('Goals', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('criar, listar e deletar metas', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const created = await request(app.server).post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        title: 'Aposentadoria',
        target: 80000,
        targetDate: '2038-01-01T00:00:00.000Z'
      })
    expect(created.status).toBe(201)
    expect(created.body.clientId).toBe(clientId)
    const goalId = created.body.id

    const list = await request(app.server)
      .get(`/clients/${clientId}/goals`)
      .set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body).toHaveLength(1)

    const del = await request(app.server)
      .delete(`/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const list2 = await request(app.server)
      .get(`/clients/${clientId}/goals`)
      .set('Authorization', `Bearer ${token}`)
    expect(list2.body).toHaveLength(0)
  })

    it('POST /goals -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const bad = await request(app.server).post('/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        title: '',
        target: -10,
        targetDate: 'not-a-date'
      } as any)

    expect(bad.status).toBe(400)
    expect(bad.body).toBeTruthy() 
  })

})
