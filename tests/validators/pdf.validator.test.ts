import { validaArquivoPdf } from '../../src/validators/pdf.validator'
import { FileValidationError } from '../../src/errors/AppError'
import { criaArquivoRecebido, conteudoPdf } from '../fixtures'

/*
    Testes unitários da validação de arquivos PDF.
    (Movidos do teste do service pdfDocx, que agora só cuida da conversão.)
*/
describe('validators/pdf.validator → validaArquivoPdf', () => {
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
