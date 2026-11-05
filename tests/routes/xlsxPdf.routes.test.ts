import request from 'supertest'
import app from '../../src/app'
import { conversorService } from '../../src/services/conversor.service'
import { ConversorError } from '../../src/errors/AppError'
import { TAMANHO_MAXIMO_UPLOAD_BYTES } from '../../src/constants/limites'
import { FORMATOS } from '../../src/constants/formatos'
import { conteudoXlsx } from '../fixtures'

/*
    Testes de integração da feature Excel → PDF: a requisição passa por todas
    as camadas reais. Só o conversor Python é substituído por um mock.
*/
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

// o supertest só junta o corpo de tipos conhecidos (JSON, texto); para o PDF
// é preciso ler os bytes da resposta manualmente
const leBytes = (res: any, callback: (erro: Error | null, corpo: Buffer) => void) => {
    const partes: Buffer[] = []
    res.on('data', (parte: Buffer) => partes.push(parte))
    res.on('end', () => callback(null, Buffer.concat(partes)))
}

// monta um ".xlsx" do tamanho pedido: só a assinatura ZIP seguida de zeros
const xlsxComTamanho = (tamanho: number) => {
    const conteudo = Buffer.alloc(tamanho)
    FORMATOS.XLSX.assinatura.copy(conteudo)
    return conteudo
}

describe('POST /xlsx-pdf', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('converte e devolve o PDF como download', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('%PDF-1.7 bytes do pdf'))

        const resposta = await request(app)
            .post('/xlsx-pdf')
            .attach('arquivo', conteudoXlsx(), 'planilha.xlsx')
            .buffer(true)
            .parse(leBytes)
            .expect(200)

        expect(resposta.headers['content-type']).toBe(FORMATOS.PDF.tipoConteudo)
        expect(resposta.headers['content-disposition']).toBe('attachment; filename="planilha.pdf"')
        expect(resposta.body).toEqual(Buffer.from('%PDF-1.7 bytes do pdf'))
        expect(conversorMock.converte).toHaveBeenCalledWith('/api/xlsx-pdf', expect.objectContaining({ nome: 'planilha.xlsx' }), expect.any(Number))
    })

    it.each([
        ['sem arquivo', undefined, undefined, 'NO_FILE'],
        ['com extensão errada', conteudoXlsx(), 'planilha.xls', 'INVALID_EXTENSION'],
        ['com assinatura errada (não é um .xlsx)', Buffer.from('texto qualquer'), 'planilha.xlsx', 'INVALID_EXCEL'],
        ['vazio', Buffer.alloc(0), 'planilha.xlsx', 'INVALID_EXCEL'],
    ])('responde 400 para arquivo %s, sem chamar o conversor', async (_descricao, conteudo, nome, codigo) => {
        const requisicao = request(app).post('/xlsx-pdf')
        if (conteudo && nome) requisicao.attach('arquivo', conteudo, nome)

        const resposta = await requisicao.expect(400)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: codigo }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('aceita uma planilha com exatamente 10 MB', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('%PDF-'))

        await request(app).post('/xlsx-pdf').attach('arquivo', xlsxComTamanho(TAMANHO_MAXIMO_UPLOAD_BYTES), 'limite.xlsx').expect(200)

        expect(conversorMock.converte).toHaveBeenCalledTimes(1)
    })

    it('responde 413 FILE_TOO_LARGE quando a planilha passa de 10 MB', async () => {
        const resposta = await request(app)
            .post('/xlsx-pdf')
            .attach('arquivo', xlsxComTamanho(TAMANHO_MAXIMO_UPLOAD_BYTES + 1), 'grande.xlsx')
            .expect(413)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: 'FILE_TOO_LARGE' }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('repassa o 422 quando o conversor não consegue ler a planilha (ex.: corrompida)', async () => {
        conversorMock.converte.mockRejectedValue(
            new ConversorError(422, 'Não foi possível converter o arquivo Excel: o LibreOffice não conseguiu ler a planilha')
        )

        const resposta = await request(app).post('/xlsx-pdf').attach('arquivo', conteudoXlsx(), 'corrompida.xlsx').expect(422)

        expect(resposta.body).toEqual({
            success: false,
            mensagem: 'Não foi possível converter o arquivo Excel: o LibreOffice não conseguiu ler a planilha',
            code: 'CONVERSION_FAILED'
        })
    })

    it('responde 500 CONVERTER_UNAVAILABLE quando o conversor demora demais ou está fora', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(undefined, 'timeout of 120000ms exceeded'))

        const resposta = await request(app).post('/xlsx-pdf').attach('arquivo', conteudoXlsx(), 'planilha.xlsx').expect(500)

        expect(resposta.body.code).toBe('CONVERTER_UNAVAILABLE')
    })
})
