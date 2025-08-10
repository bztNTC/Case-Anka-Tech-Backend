import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'admin3@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'admin3@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente I', email: 'i@t.com', age: 32, status: true,
      familyType: 'single', totalWealth: 120000
    })
  return res.body.id as string
}

describe('Insurances', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('CRUD de seguros + distribuição', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const life = await request(app.server).post('/insurances')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId, type: 'LIFE', coverage: 150000, premium: 120,
        startDate: '2025-09-01T00:00:00.000Z'
      })
    expect(life.status).toBe(201)
    const lifeId = life.body.id

    const dis = await request(app.server).post('/insurances')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, type: 'DISABILITY', coverage: 100000 })
    expect(dis.status).toBe(201)

    const list = await request(app.server)
      .get(`/clients/${clientId}/insurances`)
      .set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body).toHaveLength(2)

    const upd = await request(app.server)
      .put(`/insurances/${lifeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ coverage: 160000 })
    expect(upd.status).toBe(200)
    expect(upd.body.coverage).toBe(160000)

    const dist = await request(app.server)
      .get(`/clients/${clientId}/insurances/distribution`)
      .set('Authorization', `Bearer ${token}`)
    expect(dist.status).toBe(200)
    expect(dist.body.totalCoverage).toBe(260000)
    const map = Object.fromEntries(dist.body.breakdown.map((b: any) => [b.type, b.percent]))
    expect(map.LIFE).toBeCloseTo(61.54, 2)     
    expect(map.DISABILITY).toBeCloseTo(38.46, 2)

    const del = await request(app.server)
      .delete(`/insurances/${lifeId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const list2 = await request(app.server)
      .get(`/clients/${clientId}/insurances`)
      .set('Authorization', `Bearer ${token}`)
    expect(list2.body).toHaveLength(1)
  })

    it('POST /insurances -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const bad = await request(app.server).post('/insurances')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId,
        type: 'INVALID',      
        coverage: 'muito',    
        startDate: 'ontem'     
      } as any)

    expect(bad.status).toBe(400)
    expect(bad.body).toBeTruthy()
  })

  it('PUT /insurances/:id -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const ins = await request(app.server).post('/insurances')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, type: 'LIFE', coverage: 100000 })
      .expect(201)

    const badUpd = await request(app.server)
      .put(`/insurances/${ins.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        coverage: 'cem mil',  
        startDate: 12345       
      } as any)

    expect(badUpd.status).toBe(400)
    expect(badUpd.body).toBeTruthy()
  })

  it('PUT com startDate válido atualiza a data (cobre new Date(startDate))', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token)

    const created = await request(app.server).post('/insurances')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId, type: 'DISABILITY', coverage: 50000 })
      .expect(201)

    const newISO = '2027-02-15T00:00:00.000Z'
    const upd = await request(app.server)
      .put(`/insurances/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: newISO })
      .expect(200)

    expect(typeof upd.body.startDate).toBe('string')
    expect(upd.body.startDate.startsWith('2027-02-15')).toBe(true)
  })

  it('Distribuição com total 0 (sem seguros) -> { totalCoverage: 0, breakdown: [] }', async () => {
    const token = await bootstrapAdvisor(app)
    const clientId = await createClient(app, token) 

    const dist = await request(app.server)
      .get(`/clients/${clientId}/insurances/distribution`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(dist.body).toEqual({ totalCoverage: 0, breakdown: [] })
  })

})
