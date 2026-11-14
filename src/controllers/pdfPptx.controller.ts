import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { convertePdfParaPptx } from '../services/pdfPptx.service'

/*
    Controller da conversão PDF → PowerPoint.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros seguem para o middleware de erros.
*/
export const pdfPptxController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await convertePdfParaPptx(arquivo)
        enviaArquivo(res, convertido)
    }
}
