import { Request, Response } from 'express'
import { xlsxPdfController } from '../../src/controllers/xlsxPdf.controller'
import { converteXlsxParaPdf } from '../../src/services/xlsxPdf.service'
import { FileValidationError } from '../../src/errors/AppError'
import { conteudoXlsx } from '../fixtures'

/*
    Testes unitários do controller Excel → PDF.
    Cobrem o arquivo sem buffer, que não dá para reproduzir com um multipart real
    (o Multer em memoryStorage sempre preenche o buffer).
*/
jest.mock('../../src/services/xlsxPdf.service')
const serviceMock = jest.mocked(converteXlsxParaPdf)

// resposta falsa: registra as chamadas e permite encadear (res.status(...).attachment(...)...)
const criaRespostaFalsa = () => {
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.attachment = jest.fn().mockReturnValue(res)
    res.type = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    return res as Response & Record<'status' | 'attachment' | 'type' | 'send', jest.Mock>
}

describe('controllers/xlsxPdf.controller', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it.each([
        ['sem req.file', {}],
        ['com req.file sem buffer', { file: { originalname: 'planilha.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }],
    ])('lança NO_FILE %s, sem chamar o service nem responder', async (_descricao, req) => {
        const res = criaRespostaFalsa()

        await expect(xlsxPdfController.converte(req as unknown as Request, res))
            .rejects.toThrow(new FileValidationError('NO_FILE'))

        expect(serviceMock).not.toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
    })

    it('passa o arquivo ao service e envia o PDF convertido', async () => {
        const res = criaRespostaFalsa()
        const req = { file: { originalname: 'planilha.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: conteudoXlsx() } }
        const tipoPdf = 'application/pdf'
        serviceMock.mockResolvedValue({ nome: 'planilha.pdf', conteudo: Buffer.from('%PDF-'), tipoConteudo: tipoPdf })

        await xlsxPdfController.converte(req as unknown as Request, res)

        expect(serviceMock).toHaveBeenCalledWith({ nome: 'planilha.xlsx', conteudo: conteudoXlsx(), tipoConteudo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.attachment).toHaveBeenCalledWith('planilha.pdf')
        expect(res.type).toHaveBeenCalledWith(tipoPdf)
        expect(res.send).toHaveBeenCalledWith(Buffer.from('%PDF-'))
    })
})
