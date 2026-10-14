import { validaArquivoXlsx } from '../xlsx.validator'
import { FileValidationError } from '../../errors/AppError'
import { FORMATOS } from '../../constants/formatos'
import { criaArquivoRecebido, conteudoXlsx } from '../../test-utils/fixtures'

/*
    Testes unitários da validação de arquivos Excel (.xlsx).
    (Movidos do teste do service xlsxJson, que agora só cuida da conversão.)
*/
describe('validators/xlsx.validator → validaArquivoXlsx', () => {
    it('aceita um .xlsx com a assinatura correta (extensão em qualquer caixa)', () => {
        expect(() => validaArquivoXlsx(criaArquivoRecebido('PLANILHA.XLSX', conteudoXlsx()))).not.toThrow()
    })

    it.each(['planilha.xls', 'dados.json', 'semextensao'])('lança INVALID_EXTENSION para "%s"', (nome) => {
        expect(() => validaArquivoXlsx(criaArquivoRecebido(nome, conteudoXlsx())))
            .toThrow(new FileValidationError('INVALID_EXTENSION', 'xlsx'))
    })

    it.each([
        ['com outra assinatura', Buffer.from('não é excel')],
        ['vazio', Buffer.alloc(0)],
        ['só com o início da assinatura', FORMATOS.XLSX.assinatura.subarray(0, 4)],
    ])('lança INVALID_EXCEL para arquivo %s', (_descricao, conteudo) => {
        expect(() => validaArquivoXlsx(criaArquivoRecebido('planilha.xlsx', conteudo)))
            .toThrow(new FileValidationError('INVALID_EXCEL'))
    })
})
