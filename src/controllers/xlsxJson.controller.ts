import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { converteXlsxParaJson } from '../services/xlsxJson.service'

/*
    Controller da conversão Excel → JSON.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros seguem para o middleware de erros.
*/
export const xlsxJsonController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await converteXlsxParaJson(arquivo)
        enviaArquivo(res, convertido)
    }
}
