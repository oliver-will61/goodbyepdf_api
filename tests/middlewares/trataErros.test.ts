import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { trataErros } from '../../src/middlewares/trataErros'
import { FileValidationError, ConversorError } from '../../src/errors/AppError'
import { ErrorMessagens } from '../../src/constants/errorMessages'

// res do Express com status() encadeável
const criaResponse = () => {
    const res = {} as Response
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
}

// chama o middleware com um erro e devolve o res para as verificações
const trata = (erro: unknown) => {
    const res = criaResponse()
    trataErros(erro, {} as Request, res, jest.fn() as NextFunction)
    return res
}

describe('middlewares/trataErros', () => {

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('responde AppError com o status e o código do próprio erro', () => {
        const res = trata(new FileValidationError('INVALID_JSON'))

        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            mensagem: ErrorMessagens.FILE.INVALID_JSON,
            code: 'INVALID_JSON'
        })
    })

    it('repassa o status 4xx de um ConversorError', () => {
        const res = trata(new ConversorError(422, 'não foi possível converter'))

        expect(res.status).toHaveBeenCalledWith(422)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CONVERSION_FAILED' }))
    })

    it('transforma o erro de tamanho do Multer em 413 FILE_TOO_LARGE', () => {
        const res = trata(new multer.MulterError('LIMIT_FILE_SIZE', 'arquivo'))

        expect(res.status).toHaveBeenCalledWith(413)
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'FILE_TOO_LARGE' }))
    })

    it('responde 500 com mensagem genérica para erros inesperados, sem expor detalhes', () => {
        const res = trata(new Error('detalhe interno do banco'))

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            mensagem: ErrorMessagens.OTHER,
            code: 'INTERNAL_ERROR'
        })
        expect(console.error).toHaveBeenCalled()
    })
})
