import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../../src/utils/http'
import { FileValidationError } from '../../src/errors/AppError'

describe('utils/http', () => {

    describe('extraiArquivo', () => {
        it('converte o req.file do Multer em ArquivoRecebido', () => {
            const conteudo = Buffer.from('[]')
            const req = { file: { originalname: 'dados.json', buffer: conteudo, mimetype: 'application/json' } } as Request

            expect(extraiArquivo(req)).toEqual({ nome: 'dados.json', conteudo, tipoConteudo: 'application/json' })
        })

        it('lança NO_FILE quando não há arquivo', () => {
            expect(() => extraiArquivo({} as Request)).toThrow(new FileValidationError('NO_FILE'))
        })

        it('lança NO_FILE quando o arquivo não está em memória (sem buffer)', () => {
            // aconteceria se o Multer voltasse a gravar em disco
            const req = { file: { originalname: 'dados.json', path: 'upload/abc' } } as unknown as Request

            expect(() => extraiArquivo(req)).toThrow(FileValidationError)
        })
    })

    describe('enviaArquivo', () => {
        it('responde 200 com download, tipo de conteúdo e bytes do arquivo', () => {
            // res com métodos encadeáveis, como o do Express
            const res = {} as Response
            res.status = jest.fn().mockReturnValue(res)
            res.attachment = jest.fn().mockReturnValue(res)
            res.type = jest.fn().mockReturnValue(res)
            res.send = jest.fn().mockReturnValue(res)
            const conteudo = Buffer.from('xlsx')

            enviaArquivo(res, { nome: 'dados.xlsx', conteudo, tipoConteudo: 'application/x-teste' })

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.attachment).toHaveBeenCalledWith('dados.xlsx')
            expect(res.type).toHaveBeenCalledWith('application/x-teste')
            expect(res.send).toHaveBeenCalledWith(conteudo)
        })
    })
})
