import request from 'supertest'
import app from '../../src/app'
import { conversorService } from '../../src/services/conversor.service'

// só o conversor Python é substituído por um mock
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('GET /health', () => {

    it('responde 200 quando o conversor está no ar', async () => {
        conversorMock.verificaSaude.mockResolvedValue(true)

        const resposta = await request(app).get('/health').expect(200)

        expect(resposta.body).toEqual({ status: 'ok', conversor: 'ok' })
    })

    it('responde 503 quando o conversor está fora do ar', async () => {
        conversorMock.verificaSaude.mockResolvedValue(false)

        const resposta = await request(app).get('/health').expect(503)

        expect(resposta.body).toEqual({ status: 'degradado', conversor: 'indisponível' })
    })
})
