import fs from 'fs'
import path from 'path'
import request from 'supertest'
import app from '../../src/app'
import { conversorService } from '../../src/services/conversor.service'
import { ConversorError } from '../../src/errors/AppError'
import { TAMANHO_MAXIMO_UPLOAD_BYTES } from '../../src/constants/limites'
import { FORMATOS } from '../../src/constants/formatos'
import { conteudoJson } from '../fixtures'

/*
    Testes de integração da feature JSON → Excel: a requisição passa por todas as
    camadas reais (rota, upload, controller, service, tratamento de erros).
    Só o conversor Python é substituído por um mock.
*/
jest.mock('../../src/services/conversor.service')
const conversorMock = jest.mocked(conversorService)

// o supertest só junta o corpo de tipos conhecidos (JSON, texto); para o .xlsx
// é preciso ler os bytes da resposta manualmente
const leBytes = (res: any, callback: (erro: Error | null, corpo: Buffer) => void) => {
    const partes: Buffer[] = []
    res.on('data', (parte: Buffer) => partes.push(parte))
    res.on('end', () => callback(null, Buffer.concat(partes)))
}

describe('POST /json-xlsx', () => {

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('converte e devolve a planilha como download', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('bytes da planilha'))

        const resposta = await request(app)
            .post('/json-xlsx')
            .attach('arquivo', conteudoJson(), 'relatorio.json')
            .buffer(true)
            .parse(leBytes)
            .expect(200)

        expect(resposta.headers['content-type']).toBe(FORMATOS.XLSX.tipoConteudo)
        expect(resposta.headers['content-disposition']).toBe('attachment; filename="relatorio.xlsx"')
        expect(resposta.body).toEqual(Buffer.from('bytes da planilha'))
    })

    it('mantém o arquivo só em memória: o conversor recebe os bytes e nada é gravado em disco', async () => {
        conversorMock.converte.mockResolvedValue(Buffer.from('ok'))
        const conteudo = conteudoJson()

        await request(app).post('/json-xlsx').attach('arquivo', conteudo, 'dados.json').expect(200)

        const [endpoint, arquivoEnviado] = conversorMock.converte.mock.calls[0]!
        expect(endpoint).toBe('/api/json-xlsx')
        expect(arquivoEnviado.conteudo.equals(conteudo)).toBe(true)
        expect(fs.existsSync(path.resolve(process.cwd(), 'upload'))).toBe(false)
    })

    it.each([
        ['sem arquivo', undefined, undefined, 400, 'NO_FILE'],
        ['com extensão errada', Buffer.from('[]'), 'dados.txt', 400, 'INVALID_EXTENSION'],
        ['com JSON malformado', Buffer.from('{ quebrado'), 'dados.json', 400, 'INVALID_JSON'],
    ])('responde %s com %s %s, sem chamar o conversor', async (_descricao, conteudo, nome, status, codigo) => {
        const requisicao = request(app).post('/json-xlsx')
        if (conteudo && nome) requisicao.attach('arquivo', conteudo, nome)

        const resposta = await requisicao.expect(status)

        expect(resposta.body).toEqual(expect.objectContaining({ success: false, code: codigo }))
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('aceita um arquivo exatamente no limite de tamanho', async () => {
        // o conteúdo não importa aqui: o service mockado no limite só precisa ser alcançado
        conversorMock.converte.mockResolvedValue(Buffer.from('ok'))
        const conteudo = Buffer.alloc(TAMANHO_MAXIMO_UPLOAD_BYTES, ' ')
        conteudo.write('[]')

        await request(app).post('/json-xlsx').attach('arquivo', conteudo, 'dados.json').expect(200)
    })

    it('responde 413 FILE_TOO_LARGE quando o arquivo passa do limite', async () => {
        const resposta = await request(app)
            .post('/json-xlsx')
            .attach('arquivo', Buffer.alloc(TAMANHO_MAXIMO_UPLOAD_BYTES + 1), 'dados.json')
            .expect(413)

        expect(resposta.body).toEqual({
            success: false,
            mensagem: 'Arquivo muito grande. O tamanho máximo é 10 MB.',
            code: 'FILE_TOO_LARGE'
        })
        expect(conversorMock.converte).not.toHaveBeenCalled()
    })

    it('repassa o status e a mensagem quando o conversor recusa o conteúdo', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(422, 'Não foi possível converter o arquivo JSON'))

        const resposta = await request(app).post('/json-xlsx').attach('arquivo', conteudoJson(), 'dados.json').expect(422)

        expect(resposta.body).toEqual({
            success: false,
            mensagem: 'Não foi possível converter o arquivo JSON',
            code: 'CONVERSION_FAILED'
        })
    })

    it('responde 500 CONVERTER_UNAVAILABLE quando o conversor está fora do ar', async () => {
        conversorMock.converte.mockRejectedValue(new ConversorError(undefined, 'connect ECONNREFUSED'))

        const resposta = await request(app).post('/json-xlsx').attach('arquivo', conteudoJson(), 'dados.json').expect(500)

        expect(resposta.body.code).toBe('CONVERTER_UNAVAILABLE')
    })
})
