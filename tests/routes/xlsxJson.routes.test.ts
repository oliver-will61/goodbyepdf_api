import request from 'supertest'
import app from '../../src/app'
import { conversorService } from '../../src/services/conversor.service'
import { ConversorError } from '../../src/errors/AppError'
import { FORMATOS } from '../../src/constants/formatos'
import { conteudoXlsx } from '../fixtures'

/*
    Testes de integração da feature Excel → JSON: a requisição passa por todas as
    camadas reais. Só o conversor Python é substituído por um mock.
*/
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

describe('POST /xlsx-json', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('converte e devolve o JSON como download', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('[{"nome":"Ana"}]'))

        const resposta = await request(app)
            .post('/xlsx-json')
            .attach('arquivo', conteudoXlsx(), 'vendas.xlsx')
            .expect(200)

        expect(resposta.headers['content-type']).toBe(FORMATOS.JSON.tipoConteudo)
        expect(resposta.headers['content-disposition']).toBe('attachment; filename="vendas.json"')
        expect(resposta.text).toBe('[{"nome":"Ana"}]')
        expect(conversorMock.converte).toHaveBeenCalledWith('/api/xlsx-json', expect.objectContaining({ nome: 'vendas.xlsx' }))
    })

    it.each([
        ['sem arquivo', undefined, undefined, 'NO_FILE'],
        ['com extensão errada', conteudoXlsx(), 'planilha.xls', 'INVALID_EXTENSION'],
        ['com assinatura inválida', Buffer.from('não é excel'), 'planilha.xlsx', 'INVALID_EXCEL'],
        ['vazio', Buffer.alloc(0), 'planilha.xlsx', 'INVALID_EXCEL'],
    ])('responde 400 %s (%s), sem chamar o conversor', async (_descricao, conteudo, nome, codigo) => {
        const requisicao = request(app).post('/xlsx-json')
        if (conteudo && nome) requisicao.attach('arquivo', conteudo, nome)

        const resposta = await requisicao.expect(400)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: codigo }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('repassa o status e a mensagem quando o conversor recusa a planilha', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(422, 'Não foi possível converter o arquivo Excel'))

        const resposta = await request(app).post('/xlsx-json').attach('arquivo', conteudoXlsx(), 'planilha.xlsx').expect(422)

        expect(resposta.body.code).toBe('CONVERSION_FAILED')
    })
})
