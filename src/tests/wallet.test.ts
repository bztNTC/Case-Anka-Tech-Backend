import request from 'supertest'
import { buildTestApp } from './utils/test-app'
import { resetDb } from './utils/db'

async function bootstrapAdvisor(app: any) {
  await request(app.server).post('/auth/signup').send({
    name: 'Admin', email: 'wallet@t.com', password: 'secret123', role: 'ADVISOR'
  })
  const login = await request(app.server).post('/auth/login').send({
    email: 'wallet@t.com', password: 'secret123'
  })
  return login.body.token as string
}

async function createClient(app: any, token: string) {
  const res = await request(app.server).post('/clients')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Cliente W',
      email: `w${Date.now()}@t.com`,
      age: 28,
      status: true,
      familyType: 'single',
      totalWealth: 110000
    })
  return res.body
}

describe('Wallet', () => {
  let app: any
  beforeEach(async () => {
    await resetDb()
    app = await buildTestApp()
  })
  afterEach(async () => {
    await app.close()
  })

  it('cria, lista e remove itens de carteira', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    const w1 = await request(app.server).post('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, assetType: 'Renda Fixa', percent: 60 })
      .expect(201)

    await request(app.server).post('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: client.id, assetType: 'Ações', percent: 40 })
      .expect(201)

    const list = await request(app.server)
      .get(`/clients/${client.id}/wallet`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(list.body.length).toBe(2)
    expect(list.body.map((i: any) => i.assetType).sort()).toEqual(['Ações', 'Renda Fixa'])

    await request(app.server)
      .delete(`/wallet/${w1.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const list2 = await request(app.server)
      .get(`/clients/${client.id}/wallet`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(list2.body.length).toBe(1)
  })

  it('POST /wallet -> 400 quando payload é inválido (Zod)', async () => {
    const token = await bootstrapAdvisor(app)
    const client = await createClient(app, token)

    const bad = await request(app.server).post('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({
        clientId: client.id,
        assetType: '',
        percent: 150
      } as any)

    expect(bad.status).toBe(400)
    expect(bad.body).toBeTruthy()
  })

})
