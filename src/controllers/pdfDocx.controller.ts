import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { convertePdfParaDocx } from '../services/pdfDocx.service'

/*
    Controller da conversão PDF → Word.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros seguem para o middleware de erros.
*/
export const pdfDocxController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await convertePdfParaDocx(arquivo)
        enviaArquivo(res, convertido)
    }
}
