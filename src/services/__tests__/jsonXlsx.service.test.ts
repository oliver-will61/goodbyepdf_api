import { validaArquivoJson, converteJsonParaXlsx } from '../jsonXlsx.service'
import { conversorService } from '../conversor.service'
import { FileValidationError } from '../../errors/AppError'
import { FORMATOS } from '../../constants/formatos'
import { criaArquivoRecebido, conteudoJson } from '../../test-utils/fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/jsonXlsx.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('validaArquivoJson', () => {
        it('aceita um .json com conteúdo válido (extensão em qualquer caixa)', () => {
            expect(() => validaArquivoJson(criaArquivoRecebido('DADOS.JSON', conteudoJson()))).not.toThrow()
        })

        it.each(['dados.txt', 'dados.xlsx', 'semextensao'])('lança INVALID_EXTENSION para "%s"', (nome) => {
            expect(() => validaArquivoJson(criaArquivoRecebido(nome, conteudoJson())))
                .toThrow(new FileValidationError('INVALID_EXTENSION', 'json'))
        })

        it.each([
            ['malformado', '{ nome: "Ana"'],
            ['vazio', ''],
        ])('lança INVALID_JSON para conteúdo %s', (_descricao, texto) => {
            expect(() => validaArquivoJson(criaArquivoRecebido('dados.json', Buffer.from(texto))))
                .toThrow(new FileValidationError('INVALID_JSON'))
        })
    })

    describe('converteJsonParaXlsx', () => {
        it('envia ao endpoint JSON → XLSX e devolve a planilha com nome e tipo corretos', async () => {
            const arquivo = criaArquivoRecebido('relatorio.json', conteudoJson())
            conversorMock.converte.mockResolvedValue(Buffer.from('planilha'))

            const resultado = await converteJsonParaXlsx(arquivo)

            expect(conversorMock.converte).toHaveBeenCalledWith('/api/json-xlsx', arquivo)
            expect(resultado).toEqual({
                nome: 'relatorio.xlsx',
                conteudo: Buffer.from('planilha'),
                tipoConteudo: FORMATOS.XLSX.tipoConteudo
            })
        })

        it('não chama o conversor quando o arquivo é inválido', async () => {
            await expect(converteJsonParaXlsx(criaArquivoRecebido('dados.json', Buffer.from('{'))))
                .rejects.toBeInstanceOf(FileValidationError)
            expect(conversorMock.converte).not.toHaveBeenCalled()
        })
    })
})
