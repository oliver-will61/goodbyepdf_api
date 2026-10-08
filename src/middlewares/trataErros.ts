import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { AppError, FileValidationError } from '../errors/AppError'
import { ErrorMessagens } from '../constants/errorMessages'

/*
    Tratamento central de erros: transforma qualquer erro lançado em routes,
    controllers ou services em uma resposta JSON { success: false, mensagem, code }.
    Precisa ser registrado depois das rotas (ver app.ts).
*/
export function trataErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
    // arquivo acima do limite configurado no Multer (middlewares/upload.ts)
    if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
        erro = new FileValidationError('FILE_TOO_LARGE')
    }

    // erros da aplicação já sabem o próprio status e código
    if (erro instanceof AppError) {
        return res.status(erro.status).json({
            success: false,
            mensagem: erro.message,
            code: erro.code
        })
    }

    // qualquer outro erro: registra no log e devolve uma mensagem genérica,
    // sem expor detalhes internos ao cliente
    console.error('Erro inesperado:', erro)
    return res.status(500).json({
        success: false,
        mensagem: ErrorMessagens.OTHER,
        code: 'INTERNAL_ERROR'
    })
}
