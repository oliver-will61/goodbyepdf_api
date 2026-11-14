import { Request, Response } from 'express'
import { extraiArquivo, enviaArquivo } from '../utils/http'
import { converteJsonParaXlsx } from '../services/jsonXlsx.service'

/*
    Controller da conversão JSON → Excel.
    Só lida com HTTP: extrai o arquivo da requisição, chama o service e responde.
    Erros lançados aqui ou no service seguem para o middleware de erros (Express 5
    repassa automaticamente as rejeições de handlers async).
*/
export const jsonXlsxController = {
    async converte(req: Request, res: Response): Promise<void> {
        const arquivo = extraiArquivo(req)
        const convertido = await converteJsonParaXlsx(arquivo)
        enviaArquivo(res, convertido)
    }
}
