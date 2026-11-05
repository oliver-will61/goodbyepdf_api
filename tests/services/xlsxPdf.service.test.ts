import { converteXlsxParaPdf, TIMEOUT_XLSX_PDF_MS } from '../../src/services/xlsxPdf.service'
import { conversorService } from '../../src/services/conversor.service'
import { FileValidationError } from '../../src/errors/AppError'
import { FORMATOS } from '../../src/constants/formatos'
import { criaArquivoRecebido, conteudoXlsx } from '../fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/xlsxPdf.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('converteXlsxParaPdf', () => {
        it('envia ao endpoint XLSX → PDF com timeout maior e devolve o PDF', async () => {
            const arquivo = criaArquivoRecebido('planilha.xlsx', conteudoXlsx())
            conversorMock.converte.mockResolvedValue(Buffer.from('%PDF-1.7 documento'))

            const resultado = await converteXlsxParaPdf(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/xlsx-pdf', arquivo, TIMEOUT_XLSX_PDF_MS)
            expect(resultado).toEqual({
                nome: 'planilha.pdf',
                conteudo: Buffer.from('%PDF-1.7 documento'),
                tipoConteudo: FORMATOS.PDF.tipoConteudo
            })
        })

        it('usa um timeout de 120 s (o LibreOffice é lento para planilhas grandes)', () => {
            expect(TIMEOUT_XLSX_PDF_MS).toBe(120000)
        })

        it('aceita a extensão .xlsx em qualquer caixa', async () => {
            conversorMock.converte.mockResolvedValue(Buffer.from('%PDF-'))

            const resultado = await converteXlsxParaPdf(criaArquivoRecebido('VENDAS.XLSX', conteudoXlsx()))

            expect(resultado.nome).toBe('VENDAS.pdf')
        })

        // extensão: só .xlsx é aceito (.xls e .xlsm também são recusados)
        it.each(['documento.pdf', 'planilha.xls', 'planilha.xlsm', 'dados.json', 'semextensao'])(
            'lança INVALID_EXTENSION para "%s"', async (nome) => {
                await expect(converteXlsxParaPdf(criaArquivoRecebido(nome, conteudoXlsx())))
                    .rejects.toThrow(new FileValidationError('INVALID_EXTENSION', 'xlsx'))
                expect(conversorMock.converte).not.toHaveBeenCalled()
            })

        // assinatura: o conteúdo precisa começar como um ZIP OOXML; arquivo vazio também falha aqui
        it.each([
            ['com outro conteúdo (renomeado para .xlsx)', Buffer.from('não sou uma planilha')],
            ['PDF renomeado para .xlsx', FORMATOS.PDF.assinatura],
            ['vazio', Buffer.alloc(0)],
        ])('lança INVALID_EXCEL para arquivo %s, sem chamar o conversor', async (_descricao, conteudo) => {
            await expect(converteXlsxParaPdf(criaArquivoRecebido('planilha.xlsx', conteudo)))
                .rejects.toThrow(new FileValidationError('INVALID_EXCEL'))
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })
    })
})
