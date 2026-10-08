import { Request, Response } from 'express'
import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'

/*
    Funções auxiliares dos controllers para lidar com req/res.
*/

// extrai o arquivo enviado no campo "arquivo" (colocado em req.file pelo Multer)
export function extraiArquivo(req: Request): ArquivoRecebido {
    // sem buffer não há arquivo em memória para converter
    if (!req.file?.buffer) {
        throw new FileValidationError('NO_FILE')
    }

    return {
        nome: req.file.originalname,
        conteudo: req.file.buffer,
        tipoConteudo: req.file.mimetype
    }
}

// envia o arquivo convertido como download, com nome e tipo de conteúdo corretos
export function enviaArquivo(res: Response, arquivo: ArquivoConvertido): void {
    res.status(200)
        .attachment(arquivo.nome)       // Content-Disposition: attachment; filename="..."
        .type(arquivo.tipoConteudo)
        .send(arquivo.conteudo)
}
