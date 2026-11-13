import { validaArquivoPdf } from '../../src/validators/pdf.validator'
import { convertePdfParaXlsx, TIMEOUT_PDF_XLSX_MS } from '../../src/services/pdfXlsx.service'
import { conversorService } from '../../src/services/conversor.service'
import { FileValidationError } from '../../src/errors/AppError'
import { FORMATOS } from '../../src/constants/formatos'
import { criaArquivoRecebido, conteudoPdf } from '../fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/pdfXlsx.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('convertePdfParaXlsx', () => {
        it('envia ao endpoint PDF → XLSX com timeout maior e devolve a planilha', async () => {
            const arquivo = criaArquivoRecebido('relatorio.pdf', conteudoPdf())
            conversorMock.converte.mockResolvedValue(Buffer.from('planilha'))

            const resultado = await convertePdfParaXlsx(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/pdf-xlsx', arquivo, TIMEOUT_PDF_XLSX_MS)
            expect(resultado).toEqual({
                nome: 'relatorio.xlsx',
                conteudo: Buffer.from('planilha'),
                tipoConteudo: FORMATOS.XLSX.tipoConteudo
            })
        })

        it('aceita a extensão .pdf em qualquer caixa', async () => {
            conversorMock.converte.mockResolvedValue(Buffer.from('planilha'))

            const resultado = await convertePdfParaXlsx(criaArquivoRecebido('RELATORIO.PDF', conteudoPdf()))

            expect(resultado.nome).toBe('RELATORIO.xlsx')
        })

        // extensão: só .pdf é aceito
        it.each(['planilha.xlsx', 'documento.txt', 'semextensao'])('lança INVALID_EXTENSION para "%s"', async (nome) => {
            await expect(convertePdfParaXlsx(criaArquivoRecebido(nome, conteudoPdf())))
                .rejects.toThrow(new FileValidationError('INVALID_EXTENSION', 'pdf'))
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })

        // assinatura: o conteúdo precisa começar com "%PDF-"; arquivo vazio também falha aqui
        it.each([
            ['com outro conteúdo (renomeado para .pdf)', Buffer.from('não sou um pdf')],
            ['só com parte do cabeçalho', Buffer.from('%PD')],
            ['vazio', Buffer.alloc(0)],
        ])('lança INVALID_PDF para arquivo %s, sem chamar o conversor', async (_descricao, conteudo) => {
            await expect(convertePdfParaXlsx(criaArquivoRecebido('relatorio.pdf', conteudo)))
                .rejects.toThrow(new FileValidationError('INVALID_PDF'))
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })

        it('usa a validação de PDF compartilhada (validators/pdf.validator)', () => {
            // a mesma validação é usada pelas conversões para Word e PowerPoint: todas as features recusam os mesmos arquivos
            expect(() => validaArquivoPdf(criaArquivoRecebido('relatorio.pdf', Buffer.alloc(0))))
                .toThrow(new FileValidationError('INVALID_PDF'))
        })
    })
})
