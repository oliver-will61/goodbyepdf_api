import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { converteXlsxParaPdf } from '../services/xlsxPdf.service'

/*
    Controller da conversão Excel → PDF.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros seguem para o middleware de erros.
*/
export const xlsxPdfController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await converteXlsxParaPdf(arquivo)
        enviaArquivo(res, convertido)
    }
}
