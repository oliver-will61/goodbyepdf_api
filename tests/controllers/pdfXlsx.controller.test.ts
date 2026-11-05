import { Request, Response } from 'express'
import { pdfXlsxController } from '../../src/controllers/pdfXlsx.controller'
import { convertePdfParaXlsx } from '../../src/services/pdfXlsx.service'
import { FileValidationError } from '../../src/errors/AppError'
import { conteudoPdf } from '../fixtures'

/*
    Testes unitários do controller PDF → Excel.
    Cobrem o arquivo sem buffer, que não dá para reproduzir com um multipart real
    (o Multer em memoryStorage sempre preenche o buffer).
*/
jest.mock('../../src/services/pdfXlsx.service')
const serviceMock = jest.mocked(convertePdfParaXlsx)

// resposta falsa: registra as chamadas e permite encadear (res.status(...).attachment(...)...)
const criaRespostaFalsa = () => {
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.attachment = jest.fn().mockReturnValue(res)
    res.type = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    return res as Response & Record<'status' | 'attachment' | 'type' | 'send', jest.Mock>
}

describe('controllers/pdfXlsx.controller', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it.each([
        ['sem req.file', {}],
        ['com req.file sem buffer', { file: { originalname: 'relatorio.pdf', mimetype: 'application/pdf' } }],
    ])('lança NO_FILE %s, sem chamar o service nem responder', async (_descricao, req) => {
        const res = criaRespostaFalsa()

        await expect(pdfXlsxController.converte(req as unknown as Request, res))
            .rejects.toThrow(new FileValidationError('NO_FILE'))

        expect(serviceMock).not.toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
    })

    it('passa o arquivo ao service e envia o .xlsx convertido', async () => {
        const res = criaRespostaFalsa()
        const req = { file: { originalname: 'relatorio.pdf', mimetype: 'application/pdf', buffer: conteudoPdf() } }
        const tipoXlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        serviceMock.mockResolvedValue({ nome: 'relatorio.xlsx', conteudo: Buffer.from('xlsx'), tipoConteudo: tipoXlsx })

        await pdfXlsxController.converte(req as unknown as Request, res)

        expect(serviceMock).toHaveBeenCalledWith({ nome: 'relatorio.pdf', conteudo: conteudoPdf(), tipoConteudo: 'application/pdf' })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.attachment).toHaveBeenCalledWith('relatorio.xlsx')
        expect(res.type).toHaveBeenCalledWith(tipoXlsx)
        expect(res.send).toHaveBeenCalledWith(Buffer.from('xlsx'))
    })
})
