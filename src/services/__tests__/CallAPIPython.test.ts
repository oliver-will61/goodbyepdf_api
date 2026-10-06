import { Request, Response } from 'express'
import axios from 'axios'
import { CallAPIPython } from '../CallAPIPython'

// as chamadas HTTP ao serviço Python são substituídas por mocks
jest.mock('axios')
const axiosMock = jest.mocked(axios)

const BASE_URL = 'http://conversor-teste:5000'
const ENDPOINT = '/api/json-xlsx'

// res do Express com status() encadeável, como o original
const criaResponse = () => {
    const res = {} as Response
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    return res
}

// req com um arquivo em memória, como o Multer entrega
const criaRequest = (buffer: Buffer | null = Buffer.from('[{"a":1}]')) => ({
    file: { originalname: 'dados.json', mimetype: 'application/json', buffer }
} as unknown as Request)

// simula o erro que o axios lança quando o servidor responde com status de erro;
// com responseType 'arraybuffer', o corpo vem em bytes
const erroAxios = (status: number, corpo: string) => Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: Buffer.from(corpo, 'utf8') }
})

describe('CallAPIPython', () => {
    const urlOriginal = process.env.CONVERSOR_API_URL

    beforeEach(() => {
        jest.clearAllMocks()
        // a URL base é lida do ambiente no constructor
        process.env.CONVERSOR_API_URL = BASE_URL
        // o serviço registra logs de depuração; silencia nos testes
        jest.spyOn(console, 'log').mockImplementation(() => {})
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
        process.env.CONVERSOR_API_URL = urlOriginal
    })

    describe('verificaSaude', () => {
        it('retorna true quando o /health responde', async () => {
            axiosMock.get.mockResolvedValue({ status: 200 })

            await expect(new CallAPIPython('').verificaSaude()).resolves.toBe(true)
            expect(axiosMock.get).toHaveBeenCalledWith(`${BASE_URL}/health`, { timeout: 3000 })
        })

        it('retorna false quando o serviço está fora do ar', async () => {
            axiosMock.get.mockRejectedValue(new Error('ECONNREFUSED'))

            await expect(new CallAPIPython('').verificaSaude()).resolves.toBe(false)
        })
    })

    describe('enviaParaAPI', () => {
        it('envia o arquivo para a URL do conversor e devolve os bytes ao cliente', async () => {
            const convertido = Buffer.from('bytes do xlsx')
            axiosMock.post.mockResolvedValue({ data: convertido })
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(), res)

            expect(axiosMock.post).toHaveBeenCalledWith(
                `${BASE_URL}${ENDPOINT}`,
                expect.anything(),
                expect.objectContaining({ responseType: 'arraybuffer' })
            )
            expect(res.send).toHaveBeenCalledWith(convertido)
        })

        it('repassa o status 4xx do Python com o "detail" decodificado', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(422, JSON.stringify({ detail: 'JSON não é uma lista' })))
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(), res)

            expect(res.status).toHaveBeenCalledWith(422)
            expect(res.json).toHaveBeenCalledWith({ success: false, mensagem: 'JSON não é uma lista' })
        })

        it('usa o corpo em texto quando o erro do Python não é JSON', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(400, 'requisição inválida'))
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith({ success: false, mensagem: 'requisição inválida' })
        })

        it('responde 500 quando o Python falha com 5xx', async () => {
            axiosMock.post.mockRejectedValue(erroAxios(500, 'Internal Server Error'))
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(), res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({
                mensagem: 'Erro ao processar arquivo no Python',
                erro: 'Internal Server Error'
            })
        })

        it('responde 500 quando não consegue se conectar ao Python', async () => {
            axiosMock.post.mockRejectedValue(new Error('connect ECONNREFUSED'))
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(), res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'connect ECONNREFUSED' }))
        })

        it('responde 500 sem chamar o Python quando o arquivo não tem buffer', async () => {
            const res = criaResponse()

            await new CallAPIPython(ENDPOINT).enviaParaAPI(criaRequest(null), res)

            expect(axiosMock.post).not.toHaveBeenCalled()
            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ erro: 'Arquivo não encontrado ou sem buffer' }))
        })
    })
})
