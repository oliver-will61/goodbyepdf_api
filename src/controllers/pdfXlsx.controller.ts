import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { convertePdfParaXlsx } from '../services/pdfXlsx.service'

/*
    Controller da conversão PDF → Excel.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros seguem para o middleware de erros.
*/
export const pdfXlsxController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await convertePdfParaXlsx(arquivo)
        enviaArquivo(res, convertido)
    }
}
