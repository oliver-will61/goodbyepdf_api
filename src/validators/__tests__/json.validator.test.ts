import { validaArquivoJson } from '../json.validator'
import { FileValidationError } from '../../errors/AppError'
import { criaArquivoRecebido, conteudoJson } from '../../test-utils/fixtures'

/*
    Testes unitários da validação de arquivos JSON.
    (Movidos do teste do service jsonXlsx, que agora só cuida da conversão.)
*/
describe('validators/json.validator → validaArquivoJson', () => {
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
