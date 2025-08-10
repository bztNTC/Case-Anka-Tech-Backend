import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'sim@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'sim@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente S',
      email: `s${Date.now()}@t.com`,
      age: 34,
      status: true,
      familyType: 'casal',
      totalWealth: 90000
    })
  return res.body
}

describe('Simulations', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('cria, lista, obtém e deleta simulação', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        type: 'DEPOSIT',
        value: 300,
        frequency: 'MONTHLY',
        startDate: `${new Date().getFullYear()}-01-01T00:00:00.000Z`
      }).expect(201)

    const created = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.05, endYear: 2060, title: 'Cenário 5%' })
      .expect(201)

    expect(created.body.clientId).toBe(client.id)
    expect(created.body.rateAnnual).toBeCloseTo(0.05, 5)
    expect(Array.isArray(created.body.result)).toBe(true)

    const simId = created.body.id

    const list = await request(app.server)
      .get(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(list.body.length).toBe(1)
    expect(list.body[0].id).toBe(simId)

    const one = await request(app.server)
      .get(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(one.body.id).toBe(simId)
    expect(Array.isArray(one.body.result)).toBe(true)
    expect(Array.isArray(one.body.eventsSnapshot)).toBe(true)

    await request(app.server)
      .delete(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const list2 = await request(app.server)
      .get(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(list2.body.length).toBe(0)
  })

    it('POST /clients/:id/simulations -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    const bad = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 'abc' } as any)

    expect(bad.status).toBe(400) 
    expect(bad.body).toBeTruthy()
  })

  it('POST -> 404 quando cliente não existe', async () => {
    const token = await bootstrapAdvisor(app)

    const created = await request(app.server).post('/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Temp',
        email: `temp-${Date.now()}@t.com`,
        age: 30,
        status: true,
        familyType: 'single',
        totalWealth: 1000
      }).expect(201)
    const deletedId = created.body.id

    await request(app.server)
      .delete(`/clients/${deletedId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.server)
      .post(`/clients/${deletedId}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.04, endYear: 2060, title: 'x' })

    expect(res.status).toBe(404) 
  })

  it('POST -> 400 quando cliente tem patrimônio 0', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)
    await request(app.server)
      .put(`/clients/${client.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ totalWealth: 0 })
      .expect(200)

    const res = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.04, endYear: 2060 })

    expect(res.status).toBe(400) 
    expect(String(res.body.error).toLowerCase()).toContain('patrimônio')
  })

  it('Snapshot de eventos cobre endDate.toISOString() e caminho null', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        type: 'DEPOSIT',
        value: 200,
        frequency: 'ANNUAL',
        startDate: `${new Date().getFullYear()}-01-01T00:00:00.000Z`,
        endDate: `${new Date().getFullYear() + 1}-12-01T00:00:00.000Z`,
      }).expect(201)

    await request(app.server).post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        type: 'WITHDRAWAL',
        value: 100,
        frequency: 'MONTHLY',
        startDate: `${new Date().getFullYear()}-06-01T00:00:00.000Z`,
      }).expect(201)

    const created = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.04, endYear: 2060, title: 'Snapshot' })
      .expect(201)

    const snap = created.body.eventsSnapshot as Array<any>
    expect(snap.length).toBe(2)

    const withEnd = snap.find(e => e.type === 'DEPOSIT')
    const noEnd = snap.find(e => e.type === 'WITHDRAWAL')

    expect(withEnd.endDate).toMatch(/T/)   
    expect(noEnd.endDate).toBeNull()      
  })

  it('GET /clients/:id/simulations/:simId -> 404 quando não existe', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    const created = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.04, endYear: 2060, title: 'to-delete' })
      .expect(201)

    const simId = created.body.id

    await request(app.server)
      .delete(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.server)
      .get(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('DELETE /clients/:id/simulations/:simId -> 404 quando não existe', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    const created = await request(app.server)
      .post(`/clients/${client.id}/simulations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateAnnual: 0.04, endYear: 2060, title: 'to-delete-2' })
      .expect(201)

    const simId = created.body.id

    await request(app.server)
      .delete(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const res = await request(app.server)
      .delete(`/clients/${client.id}/simulations/${simId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

})
