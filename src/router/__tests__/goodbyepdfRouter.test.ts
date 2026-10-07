import fs from 'fs'
import path from 'path'
import express, { Request, Response } from 'express'
import request from 'supertest'
import router from '../goodbyepdfRouter'
import { xlsxForJsonController, jsonForXlsxController } from '../../controllers/arquivosController'
import { CallAPIPython } from '../../services/CallAPIPython'

// os controllers e o cliente do Python são substituídos por mocks:
// aqui testamos só o que o router faz (Multer e /health)
jest.mock('../../controllers/arquivosController', () => ({
    xlsxForJsonController: { handleUpload: jest.fn() },
    jsonForXlsxController: { handleUpload: jest.fn() }
}))
jest.mock('../../services/CallAPIPython')

// app mínimo só com o router, sem CORS e sem arquivos estáticos
const app = express()
app.use('/', router)

// pasta onde o Multer gravava os arquivos na configuração antiga (dest: 'upload')
const PASTA_UPLOAD_ANTIGA = path.resolve(process.cwd(), 'upload')

// faz o controller mockado guardar o req.file recebido e responder 200
const capturaArquivo = (controller: { handleUpload: jest.Mock }) => {
    const capturado: { arquivo?: Express.Multer.File } = {}
    controller.handleUpload.mockImplementation(async (req: Request, res: Response) => {
        capturado.arquivo = req.file
        res.status(200).end()
    })
    return capturado
}

describe('goodbyepdfRouter', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    // as duas rotas de conversão usam o mesmo Multer
    describe.each([
        ['/json-xlsx', jsonForXlsxController, 'dados.json', Buffer.from('[{"nome":"Ana"}]')],
        ['/xlsx-json', xlsxForJsonController, 'planilha.xlsx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x01])],
    ])('POST %s', (rota, controller, nomeArquivo, conteudo) => {

        it('entrega o arquivo ao controller só em memória (buffer), sem gravar em disco', async () => {
            const capturado = capturaArquivo(jest.mocked(controller as any))

            await request(app).post(rota).attach('arquivo', conteudo, nomeArquivo).expect(200)

            expect(capturado.arquivo?.originalname).toBe(nomeArquivo)
            expect(capturado.arquivo?.buffer.equals(conteudo)).toBe(true)
            // com armazenamento em disco o Multer preencheria path e destination
            expect(capturado.arquivo?.path).toBeUndefined()
            expect(capturado.arquivo?.destination).toBeUndefined()
            expect(fs.existsSync(PASTA_UPLOAD_ANTIGA)).toBe(false)
        })

        it('chama o controller sem req.file quando o campo "arquivo" não é enviado', async () => {
            const capturado = capturaArquivo(jest.mocked(controller as any))

            await request(app).post(rota).expect(200)

            expect(controller.handleUpload).toHaveBeenCalledTimes(1)
            expect(capturado.arquivo).toBeUndefined()
        })
    })

    describe('GET /health', () => {
        it('responde 200 quando o conversor está no ar', async () => {
            jest.mocked(CallAPIPython.prototype.verificaSaude).mockResolvedValue(true)

            const resposta = await request(app).get('/health').expect(200)

            expect(resposta.body).toEqual({ status: 'ok', conversor: 'ok' })
        })

        it('responde 503 quando o conversor está fora do ar', async () => {
            jest.mocked(CallAPIPython.prototype.verificaSaude).mockResolvedValue(false)

            const resposta = await request(app).get('/health').expect(503)

            expect(resposta.body).toEqual({ status: 'degradado', conversor: 'indisponível' })
        })
    })
})
