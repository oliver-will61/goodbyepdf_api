import request from 'supertest'
import app from '../../src/app'
import { conversorService } from '../../src/services/conversor.service'
import { ConversorError } from '../../src/errors/AppError'
import { TAMANHO_MAXIMO_UPLOAD_BYTES } from '../../src/constants/limites'
import { FORMATOS } from '../../src/constants/formatos'
import { conteudoPdf } from '../fixtures'

/*
    Testes de integração da feature PDF → Excel: a requisição passa por todas
    as camadas reais. Só o conversor Python é substituído por um mock.
*/
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

// o supertest só junta o corpo de tipos conhecidos (JSON, texto); para o .xlsx
// é preciso ler os bytes da resposta manualmente
const leBytes = (res: any, callback: (erro: Error | null, corpo: Buffer) => void) => {
    const partes: Buffer[] = []
    res.on('data', (parte: Buffer) => partes.push(parte))
    res.on('end', () => callback(null, Buffer.concat(partes)))
}

// monta um "PDF" do tamanho pedido: só o cabeçalho %PDF- seguido de zeros
const pdfComTamanho = (tamanho: number) => {
    const conteudo = Buffer.alloc(tamanho)
    FORMATOS.PDF.assinatura.copy(conteudo)
    return conteudo
}

describe('POST /pdf-xlsx', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('converte e devolve a planilha Excel como download', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('bytes do xlsx'))

        const resposta = await request(app)
            .post('/pdf-xlsx')
            .attach('arquivo', conteudoPdf(), 'relatorio.pdf')
            .buffer(true)
            .parse(leBytes)
            .expect(200)

        expect(resposta.headers['content-type']).toBe(FORMATOS.XLSX.tipoConteudo)
        expect(resposta.headers['content-disposition']).toBe('attachment; filename="relatorio.xlsx"')
        expect(resposta.body).toEqual(Buffer.from('bytes do xlsx'))
        expect(conversorMock.converte).toHaveBeenCalledWith('/api/pdf-xlsx', expect.objectContaining({ nome: 'relatorio.pdf' }), expect.any(Number))
    })

    it.each([
        ['sem arquivo', undefined, undefined, 'NO_FILE'],
        ['com extensão errada', conteudoPdf(), 'planilha.xlsx', 'INVALID_EXTENSION'],
        ['com assinatura errada (não é um PDF)', Buffer.from('texto qualquer'), 'relatorio.pdf', 'INVALID_PDF'],
        ['vazio', Buffer.alloc(0), 'relatorio.pdf', 'INVALID_PDF'],
    ])('responde 400 para arquivo %s, sem chamar o conversor', async (_descricao, conteudo, nome, codigo) => {
        const requisicao = request(app).post('/pdf-xlsx')
        if (conteudo && nome) requisicao.attach('arquivo', conteudo, nome)

        const resposta = await requisicao.expect(400)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: codigo }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('aceita um PDF com exatamente 10 MB', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('bytes do xlsx'))

        await request(app).post('/pdf-xlsx').attach('arquivo', pdfComTamanho(TAMANHO_MAXIMO_UPLOAD_BYTES), 'limite.pdf').expect(200)

        expect(conversorMock.converte).toHaveBeenCalledTimes(1)
    })

    it('responde 413 FILE_TOO_LARGE quando o PDF passa de 10 MB', async () => {
        const resposta = await request(app)
            .post('/pdf-xlsx')
            .attach('arquivo', pdfComTamanho(TAMANHO_MAXIMO_UPLOAD_BYTES + 1), 'grande.pdf')
            .expect(413)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: 'FILE_TOO_LARGE' }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('repassa o 422 quando o conversor não consegue ler o PDF (ex.: protegido por senha)', async () => {
        conversorMock.converte.mockRejectedValue(
            new ConversorError(422, 'Não foi possível converter o arquivo PDF: o PDF está protegido por senha.')
        )

        const resposta = await request(app).post('/pdf-xlsx').attach('arquivo', conteudoPdf(), 'protegido.pdf').expect(422)

        expect(resposta.body).toEqual({
            success: false,
            mensagem: 'Não foi possível converter o arquivo PDF: o PDF está protegido por senha.',
            code: 'CONVERSION_FAILED'
        })
    })

    it('responde 500 CONVERTER_UNAVAILABLE quando o conversor demora demais ou está fora', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(undefined, 'timeout of 120000ms exceeded'))

        const resposta = await request(app).post('/pdf-xlsx').attach('arquivo', conteudoPdf(), 'relatorio.pdf').expect(500)

        expect(resposta.body.code).toBe('CONVERTER_UNAVAILABLE')
    })
})
