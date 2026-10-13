import { validaArquivoPdf, convertePdfParaDocx, TIMEOUT_PDF_DOCX_MS } from '../pdfDocx.service'
import { conversorService } from '../conversor.service'
import { FileValidationError } from '../../errors/AppError'
import { FORMATOS } from '../../constants/formatos'
import { criaArquivoRecebido, conteudoPdf } from '../../test-utils/fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/pdfDocx.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('validaArquivoPdf', () => {
        it('aceita um .pdf com o cabeçalho %PDF- (extensão em qualquer caixa)', () => {
            expect(() => validaArquivoPdf(criaArquivoRecebido('CONTRATO.PDF', conteudoPdf()))).not.toThrow()
        })

        it.each(['documento.docx', 'documento.txt', 'semextensao'])('lança INVALID_EXTENSION para "%s"', (nome) => {
            expect(() => validaArquivoPdf(criaArquivoRecebido(nome, conteudoPdf())))
                .toThrow(new FileValidationError('INVALID_EXTENSION', 'pdf'))
        })

        it.each([
            ['com outro conteúdo (renomeado para .pdf)', Buffer.from('não sou um pdf')],
            ['vazio', Buffer.alloc(0)],
            ['só com parte do cabeçalho', Buffer.from('%PD')],
        ])('lança INVALID_PDF para arquivo %s', (_descricao, conteudo) => {
            expect(() => validaArquivoPdf(criaArquivoRecebido('documento.pdf', conteudo)))
                .toThrow(new FileValidationError('INVALID_PDF'))
        })
    })

    describe('convertePdfParaDocx', () => {
        it('envia ao endpoint PDF → DOCX com timeout maior e devolve o documento Word', async () => {
            const arquivo = criaArquivoRecebido('contrato.pdf', conteudoPdf())
            conversorMock.converte.mockResolvedValue(Buffer.from('documento word'))

            const resultado = await convertePdfParaDocx(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/pdf-docx', arquivo, TIMEOUT_PDF_DOCX_MS)
            expect(resultado).toEqual({
                nome: 'contrato.docx',
                conteudo: Buffer.from('documento word'),
                tipoConteudo: FORMATOS.DOCX.tipoConteudo
            })
        })

        it('não chama o conversor quando o arquivo é inválido', async () => {
            await expect(convertePdfParaDocx(criaArquivoRecebido('documento.pdf', Buffer.from('x'))))
                .rejects.toBeInstanceOf(FileValidationError)
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })
    })
})
