import request from 'supertest'
import app from '../../app'
import { conversorService } from '../../services/conversor.service'
import { ConversorError } from '../../errors/AppError'
import { TAMANHO_MAXIMO_UPLOAD_BYTES } from '../../constants/limites'
import { FORMATOS } from '../../constants/formatos'
import { conteudoPdf } from '../../test-utils/fixtures'

/*
    Testes de integração da feature PDF → Word: a requisição passa por todas as
    camadas reais. Só o conversor Python é substituído por um mock.
*/
jest.mock('../../services/conversor.service')
const conversorMock = jest.mocked(conversorService)

// o supertest só junta o corpo de tipos conhecidos (JSON, texto); para o .docx
// é preciso ler os bytes da resposta manualmente
const leBytes = (res: any, callback: (erro: Error | null, corpo: Buffer) => void) => {
    const partes: Buffer[] = []
    res.on('data', (parte: Buffer) => partes.push(parte))
    res.on('end', () => callback(null, Buffer.concat(partes)))
}

describe('POST /pdf-docx', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('converte e devolve o documento Word como download', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('bytes do docx'))

        const resposta = await request(app)
            .post('/pdf-docx')
            .attach('arquivo', conteudoPdf(), 'contrato.pdf')
            .buffer(true)
            .parse(leBytes)
            .expect(200)

        expect(resposta.headers['content-type']).toBe(FORMATOS.DOCX.tipoConteudo)
        expect(resposta.headers['content-disposition']).toBe('attachment; filename="contrato.docx"')
        expect(resposta.body).toEqual(Buffer.from('bytes do docx'))
        expect(conversorMock.converte).toHaveBeenCalledWith('/api/pdf-docx', expect.objectContaining({ nome: 'contrato.pdf' }), expect.any(Number))
    })

    it.each([
        ['sem arquivo', undefined, undefined, 'NO_FILE'],
        ['com extensão errada', conteudoPdf(), 'documento.docx', 'INVALID_EXTENSION'],
        ['que não é um PDF', Buffer.from('texto qualquer'), 'documento.pdf', 'INVALID_PDF'],
        ['vazio', Buffer.alloc(0), 'documento.pdf', 'INVALID_PDF'],
    ])('responde 400 %s (%s), sem chamar o conversor', async (_descricao, conteudo, nome, codigo) => {
        const requisicao = request(app).post('/pdf-docx')
        if (conteudo && nome) requisicao.attach('arquivo', conteudo, nome)

        const resposta = await requisicao.expect(400)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: codigo }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('responde 413 FILE_TOO_LARGE quando o PDF passa do limite', async () => {
        const conteudo = Buffer.alloc(TAMANHO_MAXIMO_UPLOAD_BYTES + 1)
        FORMATOS.PDF.assinatura.copy(conteudo)

        const resposta = await request(app).post('/pdf-docx').attach('arquivo', conteudo, 'grande.pdf').expect(413)

        expect(resposta.body.code).toBe('FILE_TOO_LARGE')
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('repassa o 422 quando o conversor não consegue ler o PDF (ex.: protegido por senha)', async () => {
        conversorMock.converte.mockRejectedValue(
            new ConversorError(422, 'Não foi possível converter o arquivo PDF: o PDF está protegido por senha.')
        )

        const resposta = await request(app).post('/pdf-docx').attach('arquivo', conteudoPdf(), 'protegido.pdf').expect(422)

        expect(resposta.body).toEqual({
            success: false,
            mensagem: 'Não foi possível converter o arquivo PDF: o PDF está protegido por senha.',
            code: 'CONVERSION_FAILED'
        })
    })

    it('responde 500 CONVERTER_UNAVAILABLE quando o conversor demora demais ou está fora', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(undefined, 'timeout of 120000ms exceeded'))

        const resposta = await request(app).post('/pdf-docx').attach('arquivo', conteudoPdf(), 'grande.pdf').expect(500)

        expect(resposta.body.code).toBe('CONVERTER_UNAVAILABLE')
    })
})
