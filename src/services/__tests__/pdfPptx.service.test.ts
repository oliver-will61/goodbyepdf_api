import { validaArquivoPdf } from '../../validators/pdf.validator'
import { convertePdfParaPptx, TIMEOUT_PDF_PPTX_MS } from '../pdfPptx.service'
import { conversorService } from '../conversor.service'
import { FileValidationError } from '../../errors/AppError'
import { FORMATOS } from '../../constants/formatos'
import { criaArquivoRecebido, conteudoPdf } from '../../test-utils/fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/pdfPptx.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('convertePdfParaPptx', () => {
        it('envia ao endpoint PDF → PPTX com timeout maior e devolve a apresentação', async () => {
            const arquivo = criaArquivoRecebido('slides.pdf', conteudoPdf())
            conversorMock.converte.mockResolvedValue(Buffer.from('apresentação'))

            const resultado = await convertePdfParaPptx(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/pdf-pptx', arquivo, TIMEOUT_PDF_PPTX_MS)
            expect(resultado).toEqual({
                nome: 'slides.pptx',
                conteudo: Buffer.from('apresentação'),
                tipoConteudo: FORMATOS.PPTX.tipoConteudo
            })
        })

        it('aceita a extensão .pdf em qualquer caixa', async () => {
            conversorMock.converte.mockResolvedValue(Buffer.from('apresentação'))

            const resultado = await convertePdfParaPptx(criaArquivoRecebido('SLIDES.PDF', conteudoPdf()))

            expect(resultado.nome).toBe('SLIDES.pptx')
        })

        // extensão: só .pdf é aceito
        it.each(['apresentacao.pptx', 'documento.txt', 'semextensao'])('lança INVALID_EXTENSION para "%s"', async (nome) => {
            await expect(convertePdfParaPptx(criaArquivoRecebido(nome, conteudoPdf())))
                .rejects.toThrow(new FileValidationError('INVALID_EXTENSION', 'pdf'))
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })

        // assinatura: o conteúdo precisa começar com "%PDF-"; arquivo vazio também falha aqui
        it.each([
            ['com outro conteúdo (renomeado para .pdf)', Buffer.from('não sou um pdf')],
            ['só com parte do cabeçalho', Buffer.from('%PD')],
            ['vazio', Buffer.alloc(0)],
        ])('lança INVALID_PDF para arquivo %s, sem chamar o conversor', async (_descricao, conteudo) => {
            await expect(convertePdfParaPptx(criaArquivoRecebido('slides.pdf', conteudo)))
                .rejects.toThrow(new FileValidationError('INVALID_PDF'))
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })

        it('usa a validação de PDF compartilhada (validators/pdf.validator)', () => {
            // a mesma validação é usada pela conversão para Word: as duas features recusam os mesmos arquivos
            expect(() => validaArquivoPdf(criaArquivoRecebido('slides.pdf', Buffer.alloc(0))))
                .toThrow(new FileValidationError('INVALID_PDF'))
        })
    })
})
