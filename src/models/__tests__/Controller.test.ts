import { Request, Response } from 'express'
import { Controller } from '../Controller'
import { Arquivo } from '../Arquivo'
import { ValidationError } from '../AppError'
import { CallAPIPython } from '../../services/CallAPIPython'
import { ErrorMessagens } from '../../constants/errorMessages'

// o serviço Python é substituído por um mock: aqui testamos só o fluxo do Controller
jest.mock('../../services/CallAPIPython')

const ASSINATURA_XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
const ENDPOINT = '/api/teste'

// cria um arquivo no formato que o Multer entrega (memoryStorage)
const criaArquivoMulter = (originalname: string, buffer: Buffer): Express.Multer.File => ({
    fieldname: 'arquivo',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: buffer.length,
    destination: '',
    filename: originalname,
    path: '',
    buffer,
    stream: null as any
})

// res do Express com status() encadeável, como o original
const criaResponse = () => {
    const res = {} as Response
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

// req com o arquivo (ou sem, para o caso NO_FILE)
const criaRequest = (arquivo?: Express.Multer.File) => ({ file: arquivo } as Request)

// devolve o mock de CallAPIPython criado pelo constructor do Controller
const ultimoCallAPIPython = () => {
    const instancias = jest.mocked(CallAPIPython).mock.instances
    return jest.mocked(instancias[instancias.length - 1]!)
}

describe('Controller.handleUpload', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        // Arquivo usa console.log para depuração; silencia nos testes
        jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('cria o CallAPIPython com o endpoint informado', () => {
        new Controller(Arquivo.TIPOS.json, ENDPOINT)

        expect(CallAPIPython).toHaveBeenCalledWith(ENDPOINT)
    })

    describe('sucesso', () => {
        it('valida um JSON e repassa a requisição ao serviço Python', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            const req = criaRequest(criaArquivoMulter('dados.json', Buffer.from('[{"a":1}]')))
            const res = criaResponse()

            await controller.handleUpload(req, res)

            expect(ultimoCallAPIPython().enviaParaAPI).toHaveBeenCalledWith(req, res)
            expect(res.status).not.toHaveBeenCalled()
        })

        it('valida um Excel e repassa a requisição ao serviço Python', async () => {
            const controller = new Controller(Arquivo.TIPOS.excel, ENDPOINT)
            const buffer = Buffer.concat([ASSINATURA_XLSX, Buffer.from('conteudo')])
            const req = criaRequest(criaArquivoMulter('planilha.xlsx', buffer))
            const res = criaResponse()

            await controller.handleUpload(req, res)

            expect(ultimoCallAPIPython().enviaParaAPI).toHaveBeenCalledWith(req, res)
        })
    })

    describe('erros de validação → 400', () => {
        it('responde NO_FILE quando não há arquivo', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            const res = criaResponse()

            await controller.handleUpload(criaRequest(), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                mensagem: ErrorMessagens.FILE.NO_FILE,
                code: 'NO_FILE'
            })
            expect(ultimoCallAPIPython().enviaParaAPI).not.toHaveBeenCalled()
        })

        it('responde INVALID_JSON para JSON malformado', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('dados.json', Buffer.from('{ quebrado'))), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_JSON' }))
            expect(ultimoCallAPIPython().enviaParaAPI).not.toHaveBeenCalled()
        })

        it('responde INVALID_EXTENSION para extensão errada na rota de Excel', async () => {
            const controller = new Controller(Arquivo.TIPOS.excel, ENDPOINT)
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('dados.json', Buffer.from('[]'))), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_EXTENSION' }))
        })

        it('responde INVALID_EXCEL quando a assinatura não é de .xlsx', async () => {
            const controller = new Controller(Arquivo.TIPOS.excel, ENDPOINT)
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('planilha.xlsx', Buffer.from('não é excel'))), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'INVALID_EXCEL',
                mensagem: ErrorMessagens.FILE.INVALID_EXCEL
            }))
        })

        it('responde UNSUPPORTED_TYPE para um tipo sem validação implementada', async () => {
            // o switch compara por referência com Arquivo.TIPOS, então um objeto novo cai no default
            const controller = new Controller({ extensao: 'pdf' }, ENDPOINT)
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('doc.pdf', Buffer.from('pdf'))), res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                code: 'UNSUPPORTED_TYPE',
                mensagem: ErrorMessagens.FILE.UNSUPPORTED_TYPE
            }))
        })
    })

    describe('outros erros', () => {
        it('responde 404 para ValidationError que não é de arquivo', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            ultimoCallAPIPython().enviaParaAPI.mockRejectedValue(new ValidationError('não encontrado', 'NOT_FOUND'))
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('dados.json', Buffer.from('[]'))), res)

            expect(res.status).toHaveBeenCalledWith(404)
            expect(res.json).toHaveBeenCalledWith({ success: false, mensagem: 'não encontrado', code: 'NOT_FOUND' })
        })

        it('responde 500 com a mensagem de um Error genérico', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            ultimoCallAPIPython().enviaParaAPI.mockRejectedValue(new Error('falha inesperada'))
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('dados.json', Buffer.from('[]'))), res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({ mensagem: 'falha inesperada' })
        })

        it('responde 500 com a mensagem padrão quando o erro não é um Error', async () => {
            const controller = new Controller(Arquivo.TIPOS.json, ENDPOINT)
            ultimoCallAPIPython().enviaParaAPI.mockRejectedValue('erro em texto')
            const res = criaResponse()

            await controller.handleUpload(criaRequest(criaArquivoMulter('dados.json', Buffer.from('[]'))), res)

            expect(res.status).toHaveBeenCalledWith(500)
            expect(res.json).toHaveBeenCalledWith({ mensagem: ErrorMessagens.OTHER })
        })
    })
})
