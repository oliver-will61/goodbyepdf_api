import { validaArquivoXlsx, converteXlsxParaJson } from '../xlsxJson.service'
import { conversorService } from '../conversor.service'
import { FileValidationError } from '../../errors/AppError'
import { FORMATOS } from '../../constants/formatos'
import { criaArquivoRecebido, conteudoXlsx } from '../../test-utils/fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/xlsxJson.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('validaArquivoXlsx', () => {
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

    describe('converteXlsxParaJson', () => {
        it('envia ao endpoint XLSX → JSON e devolve o JSON com nome e tipo corretos', async () => {
            const arquivo = criaArquivoRecebido('vendas.xlsx', conteudoXlsx())
            conversorMock.converte.mockResolvedValue(Buffer.from('[{"a":1}]'))

            const resultado = await converteXlsxParaJson(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/xlsx-json', arquivo)
            expect(resultado).toEqual({
                nome: 'vendas.json',
                conteudo: Buffer.from('[{"a":1}]'),
                tipoConteudo: FORMATOS.JSON.tipoConteudo
            })
        })

        it('não chama o conversor quando o arquivo é inválido', async () => {
            await expect(converteXlsxParaJson(criaArquivoRecebido('planilha.xlsx', Buffer.from('x'))))
                .rejects.toBeInstanceOf(FileValidationError)
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })
    })
})
