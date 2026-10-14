import { converteXlsxParaJson } from '../xlsxJson.service'
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
