import { verificaSaude } from '../../src/services/health.service'
import { conversorService } from '../../src/services/conversor.service'

jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/health.service', () => {

    it('status "ok" quando o conversor responde', async () => {
        conversorMock.verificaSaude.mockResolvedValue(true)

        await expect(verificaSaude()).resolves.toEqual({ status: 'ok', conversor: 'ok' })
    })

    it('status "degradado" quando o conversor está fora do ar', async () => {
        conversorMock.verificaSaude.mockResolvedValue(false)

        await expect(verificaSaude()).resolves.toEqual({ status: 'degradado', conversor: 'indisponível' })
    })
})
