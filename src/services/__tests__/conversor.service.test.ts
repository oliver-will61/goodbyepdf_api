import axios from 'axios'
import { conversorService } from '../conversor.service'
import { ConversorError } from '../../errors/AppError'
import { criaArquivoRecebido, conteudoJson } from '../../test-utils/fixtures'

// as chamadas HTTP ao serviço Python são substituídas por mocks
jest.mock('axios')
const axiosMock = jest.mocked(axios)

const URL_BASE = 'http://conversor-teste:5000'

// simula o erro que o axios lança quando o servidor responde com status de erro;
// com responseType 'arraybuffer', o corpo vem em bytes
const erroAxios = (status: number, corpo: string) => Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: Buffer.from(corpo, 'utf8') }
})

// executa a promessa e devolve o erro lançado (ou falha o teste se nada for lançado)
const capturaErro = async (promessa: Promise<unknown>): Promise<ConversorError> => {
    try {
        await promessa
    } catch (erro) {
        return erro as ConversorError
    }
    throw new Error('Era esperado que a chamada falhasse')
}

describe('services/conversor.service', () => {
    const urlOriginal = process.env.CONVERSOR_API_URL
    const arquivo = criaArquivoRecebido('dados.json', conteudoJson(), 'application/json')

    beforeEach(() => {
        jest.clearAllMocks()
        process.env.CONVERSOR_API_URL = URL_BASE
        // o service registra falhas no log; silencia nos testes
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        process.env.CONVERSOR_API_URL = urlOriginal
    })

    describe('converte', () => {
        it('envia o arquivo como multipart para a URL do endpoint e devolve os bytes', async () => {
            axiosMock.post.mockResolvedValue({ data: Buffer.from('convertido') })

            const resultado = await conversorService.converte('/api/json-xlsx', arquivo)

            expect(resultado).toEqual(Buffer.from('convertido'))
            expect(axiosMock.post).toHaveBeenCalledWith(
                `${URL_BASE}/api/json-xlsx`,
                expect.anything(),
                expect.objectContaining({ responseType: 'arraybuffer', timeout: 30000 })
            )
        })

        it('lança CONVERSION_FAILED com o status e o "detail" do conversor em erros 4xx', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(422, JSON.stringify({ detail: 'JSON não é uma lista' })))

            const erro = await capturaErro(conversorService.converte('/api/json-xlsx', arquivo))

            expect(erro).toBeInstanceOf(ConversorError)
            expect(erro.status).toBe(422)
            expect(erro.code).toBe('CONVERSION_FAILED')
            expect(erro.message).toBe('JSON não é uma lista')
        })

        it('usa o corpo em texto quando o erro do conversor não é JSON', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(400, 'requisição inválida'))

            const erro = await capturaErro(conversorService.converte('/api/json-xlsx', arquivo))

            expect(erro.message).toBe('requisição inválida')
        })

        it('lança CONVERTER_UNAVAILABLE em erros 5xx', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(500, 'Internal Server Error'))

            const erro = await capturaErro(conversorService.converte('/api/json-xlsx', arquivo))

            expect(erro.status).toBe(500)
            expect(erro.code).toBe('CONVERTER_UNAVAILABLE')
            expect(erro.detalhe).toBe('Internal Server Error')
        })

        it('lança CONVERTER_UNAVAILABLE quando não consegue se conectar', async () => {
            axiosMock.post.mockRejectedValue(new Error('connect ECONNREFUSED'))

            const erro = await capturaErro(conversorService.converte('/api/json-xlsx', arquivo))

            expect(erro.code).toBe('CONVERTER_UNAVAILABLE')
            expect(erro.detalhe).toBe('connect ECONNREFUSED')
        })
    })

    describe('verificaSaude', () => {
        it('retorna true quando o /health do conversor responde', async () => {
            axiosMock.get.mockResolvedValue({ status: 200 })

            await expect(conversorService.verificaSaude()).resolves.toBe(true)
            expect(axiosMock.get).toHaveBeenCalledWith(`${URL_BASE}/health`, { timeout: 3000 })
        })

        it('retorna false quando o conversor está fora do ar', async () => {
            axiosMock.get.mockRejectedValue(new Error('ECONNREFUSED'))

            await expect(conversorService.verificaSaude()).resolves.toBe(false)
        })
    })
})
