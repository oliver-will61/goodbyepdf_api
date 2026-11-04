import { converteJsonParaXlsx } from '../../src/services/jsonXlsx.service'
import { conversorService } from '../../src/services/conversor.service'
import { FileValidationError } from '../../src/errors/AppError'
import { FORMATOS } from '../../src/constants/formatos'
import { criaArquivoRecebido, conteudoJson } from '../fixtures'

// o conversor Python é substituído por um mock: aqui testamos só as regras da feature
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('services/jsonXlsx.service', () => {

    beforeEach(() => {
        jest.clearAllMocks()
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
