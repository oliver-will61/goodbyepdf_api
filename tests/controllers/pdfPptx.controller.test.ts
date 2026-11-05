import { Request, Response } from 'express'
import { pdfPptxController } from '../../src/controllers/pdfPptx.controller'
import { convertePdfParaPptx } from '../../src/services/pdfPptx.service'
import { FileValidationError } from '../../src/errors/AppError'
import { conteudoPdf } from '../fixtures'

/*
    Testes unitários do controller PDF → PowerPoint.
    Cobrem o arquivo sem buffer, que não dá para reproduzir com um multipart real
    (o Multer em memoryStorage sempre preenche o buffer).
*/
jest.mock('../../src/services/pdfPptx.service')
const serviceMock = jest.mocked(convertePdfParaPptx)

// resposta falsa: registra as chamadas e permite encadear (res.status(...).attachment(...)...)
const criaRespostaFalsa = () => {
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.attachment = jest.fn().mockReturnValue(res)
    res.type = jest.fn().mockReturnValue(res)
    res.send = jest.fn().mockReturnValue(res)
    return res as Response & Record<'status' | 'attachment' | 'type' | 'send', jest.Mock>
}

describe('controllers/pdfPptx.controller', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it.each([
        ['sem req.file', {}],
        ['com req.file sem buffer', { file: { originalname: 'slides.pdf', mimetype: 'application/pdf' } }],
    ])('lança NO_FILE %s, sem chamar o service nem responder', async (_descricao, req) => {
        const res = criaRespostaFalsa()

        await expect(pdfPptxController.converte(req as unknown as Request, res))
            .rejects.toThrow(new FileValidationError('NO_FILE'))

        expect(serviceMock).not.toHaveBeenCalled()
        expect(res.send).not.toHaveBeenCalled()
    })

    it('passa o arquivo ao service e envia o .pptx convertido', async () => {
        const res = criaRespostaFalsa()
        const req = { file: { originalname: 'slides.pdf', mimetype: 'application/pdf', buffer: conteudoPdf() } }
        const tipoPptx = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        serviceMock.mockResolvedValue({ nome: 'slides.pptx', conteudo: Buffer.from('pptx'), tipoConteudo: tipoPptx })

        await pdfPptxController.converte(req as unknown as Request, res)

        expect(serviceMock).toHaveBeenCalledWith({ nome: 'slides.pdf', conteudo: conteudoPdf(), tipoConteudo: 'application/pdf' })
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.attachment).toHaveBeenCalledWith('slides.pptx')
        expect(res.type).toHaveBeenCalledWith(tipoPptx)
        expect(res.send).toHaveBeenCalledWith(Buffer.from('pptx'))
    })
})
